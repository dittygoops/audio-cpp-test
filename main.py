
import numpy as np
import librosa
from mido import Message, MidiFile, MidiTrack
import math

def spectral_subtraction(data, sample_rate, noise_duration=0.2, alpha=3.0):
    """
    Reduces noise in an audio signal using a math-based Spectral Subtraction algorithm.

    Args:
        data (np.ndarray): The input audio signal.
        sample_rate (int): The sample rate of the audio.
        noise_duration (float): Duration of the initial noise segment in seconds.
        alpha (float): Over-subtraction factor.

    Returns:
        np.ndarray: The noise-reduced audio signal.
    """
    # --- Math for Noise Reduction: Spectral Subtraction ---
    n_fft = 4096
    hop_length = int(0.95 * n_fft)

    # 1. Estimate Noise Profile
    # Assume the beginning of the audio is just noise
    noise_samples = int(noise_duration * sample_rate)
    noise_segment = data[:noise_samples]
    
    # Compute the Short-Time Fourier Transform (STFT) of the noise
    noise_stft = librosa.stft(noise_segment, n_fft=n_fft, hop_length=hop_length)
    # Calculate the average magnitude of the noise spectrum
    noise_profile = np.mean(np.abs(noise_stft), axis=1, keepdims=True)

    # 2. Process the Entire Signal
    # Compute the STFT of the entire signal
    signal_stft = librosa.stft(data, n_fft=n_fft, hop_length=hop_length)
    signal_magnitude = np.abs(signal_stft)
    signal_phase = np.angle(signal_stft)

    # 3. Subtract Noise from Signal Spectrum
    # new_magnitude = signal_magnitude - alpha * noise_profile
    cleaned_magnitude = signal_magnitude - alpha * noise_profile
    
    # Ensure magnitudes are not negative (half-wave rectification)
    cleaned_magnitude = np.maximum(cleaned_magnitude, 0)

    # 4. Reconstruct the Cleaned Signal
    # Combine the cleaned magnitude with the original phase
    cleaned_stft = cleaned_magnitude * np.exp(1j * signal_phase)
    
    # Perform an Inverse STFT to get the cleaned time-domain signal
    cleaned_data = librosa.istft(cleaned_stft, hop_length=hop_length)

    return cleaned_data

def detect_beats(data, sample_rate):
    """
    Detects beat times in an audio signal using an energy-based method.
    Returns a list of timestamps in seconds.
    """
    frame_size = 1024
    hop_size = 512
    history_size = int(sample_rate / hop_size)  # ~1 second history
    C = 1.4  # Sensitivity constant

    # Calculate energy envelope
    energies = np.array([
        np.sum(data[i:i+frame_size]**2) 
        for i in range(0, len(data)-frame_size, hop_size)
    ])

    energy_history = [0] * history_size
    beat_times = []

    for i, energy in enumerate(energies):
        avg_energy = np.mean(energy_history)
        # Beat detected if e > C * <E>
        if energy > C * avg_energy and energy > 0.01:
            time = i * hop_size / sample_rate
            # Avoid detecting multiple beats too close together
            if not beat_times or (time - beat_times[-1]) > 0.2: # Refractory period
                 beat_times.append(time)

        # Update history buffer
        energy_history.pop(0)
        energy_history.append(energy)
    
    return np.array(beat_times)

def detect_bpm(data, sample_rate):
    """
    Detects the BPM of an audio signal using a sliding window over detected beats.
    """
    # --- Math for Dynamic BPM Detection ---
    # 1. Detect beat times
    beat_times = detect_beats(data, sample_rate)
    if len(beat_times) < 4: # Need at least a few beats
        return 120 # Default BPM

    # 2. Sliding Window BPM Calculation
    window_size = 8 # Number of beats per window
    step_size = 2   # Move window by 2 beats
    local_bpms = []

    for i in range(0, len(beat_times) - window_size, step_size):
        # Select windowed beats
        window = beat_times[i : i + window_size]
        
        # Compute inter-beat intervals (IBIs)
        # delta_t_i = t_{i+1} - t_i
        ibis = np.diff(window)
        
        # Compute the average interval in the window
        if len(ibis) > 0:
            mean_ibi = np.mean(ibis)
            if mean_ibi > 0:
                # Convert to local BPM: BPM = 60 / mean_IBI
                local_bpm = 60 / mean_ibi
                local_bpms.append(local_bpm)

    if not local_bpms:
        return 120 # Default if no local BPMs were calculated

    # 3. Return the median of the local BPMs for a robust single tempo
    median_bpm = np.median(local_bpms)
    return np.clip(median_bpm, 60, 180) # Clip to a plausible range

def waveform_to_midi(audio_file_path, output_midi_path='output.mid'):
    """
    Converts a monophonic audio waveform (WAV, M4A, MP3, etc.) to a MIDI file.
    """
    # --- Step 1: Preprocessing: Loading, Normalization, and Noise Reduction ---
    data, sample_rate = librosa.load(audio_file_path, sr=None, mono=True)
    data = spectral_subtraction(data, sample_rate)

    # --- Dynamic BPM Detection ---
    detected_bpm = detect_bpm(data, sample_rate)
    print(f"Detected BPM: {detected_bpm:.2f}")

    # --- Frame Analysis ---
    window_size_ms = 10
    window_size = int(sample_rate * (window_size_ms / 1000.0))
    hop_size = window_size // 2

    frames = np.array([data[i:i + window_size] for i in range(0, len(data) - window_size, hop_size)])
    
    # --- Pitch and Energy Extraction ---
    raw_frequencies = []
    energies = []
    for frame in frames:
        # Energy: E = sum(x[n]^2)
        energies.append(np.sum(frame**2))
        
        # Pitch (Autocorrelation)
        autocorr = np.correlate(frame, frame, mode='full')
        autocorr = autocorr[len(autocorr)//2:]
        peak_index = np.argmax(autocorr[1:]) + 1
        frequency = sample_rate / peak_index if peak_index > 0 else 0
        raw_frequencies.append(frequency)

    energies = np.array(energies)
    raw_frequencies = np.array(raw_frequencies)

    # --- Feature Enhancement: Vibrato, Glides, and Silence ---

    # 1. Vibrato Handling: Smooth the pitch contour with a median filter
    # F0_smooth[i] = median(F0[i-w], ..., F0[i+w])
    w = 3 # Window size for median filter
    smoothed_frequencies = np.zeros_like(raw_frequencies)
    for i in range(len(raw_frequencies)):
        start = max(0, i - w)
        end = min(len(raw_frequencies), i + w + 1)
        smoothed_frequencies[i] = np.median(raw_frequencies[start:end])

    # 2. Silence Handling: Use a dynamic energy threshold
    M = 21
    smoothed_energy = np.zeros_like(energies)
    for i in range(len(energies)):
        start = max(0, i - M // 2)
        end = min(len(energies), i + M // 2 + 1)
        smoothed_energy[i] = np.mean(energies[start:end])
    dynamic_threshold = smoothed_energy * 1.8

    # --- Note Segmentation ---
    notes = []
    current_note = None
    min_note_duration = 0.05 # 50ms, for ghost note filtering

    for i in range(len(frames)):
        frequency = smoothed_frequencies[i]
        energy = energies[i]
        is_note_active = energy > dynamic_threshold[i] and 80 < frequency < 1200

        if is_note_active:
            midi_note = int(round(69 + 12 * np.log2(frequency / 440)))

            if current_note is None:
                # Note Onset
                current_note = {
                    'pitch': midi_note,
                    'start_time': i * hop_size / sample_rate,
                    'velocity': int(np.sqrt(energy) * 90)
                }
            # 3. Glide Handling: Segment only if pitch change > 1 semitone
            elif abs(current_note['pitch'] - midi_note) > 0.5:
                # Note change, end previous note
                note_duration = (i * hop_size / sample_rate) - current_note['start_time']
                # 4. Ghost Note Filtering (by duration)
                if note_duration >= min_note_duration:
                    current_note['end_time'] = i * hop_size / sample_rate
                    notes.append(current_note)
                
                # Start new note
                current_note = {
                    'pitch': midi_note,
                    'start_time': i * hop_size / sample_rate,
                    'velocity': int(np.sqrt(energy) * 90)
                }

        elif current_note is not None:
            # Note Offset
            note_duration = (i * hop_size / sample_rate) - current_note['start_time']
            if note_duration >= min_note_duration:
                current_note['end_time'] = i * hop_size / sample_rate
                notes.append(current_note)
            current_note = None

    # Add the last note if it exists
    if current_note is not None:
        note_duration = (len(frames) * hop_size / sample_rate) - current_note['start_time']
        if note_duration >= min_note_duration:
            current_note['end_time'] = len(frames) * hop_size / sample_rate
            notes.append(current_note)

    # --- MIDI File Construction ---
    mid = MidiFile()
    track = MidiTrack()
    mid.tracks.append(track)

    ticks_per_beat = mid.ticks_per_beat
    tempo = int(60 * 1000000 / detected_bpm)
    
    last_event_time_ticks = 0

    for note in notes:
        start_time_ticks = int(librosa.time_to_ticks(note['start_time'], bpm=detected_bpm, ticks_per_beat=ticks_per_beat))
        end_time_ticks = int(librosa.time_to_ticks(note['end_time'], bpm=detected_bpm, ticks_per_beat=ticks_per_beat))

        note_on_delta = start_time_ticks - last_event_time_ticks
        duration_ticks = end_time_ticks - start_time_ticks

        track.append(Message('note_on', note=note['pitch'], velocity=min(127, note['velocity']), time=note_on_delta))
        track.append(Message('note_off', note=note['pitch'], velocity=min(127, note['velocity']), time=duration_ticks))
        
        last_event_time_ticks = end_time_ticks


    mid.save(output_midi_path)
    print(f"MIDI file saved to {output_midi_path}")

if __name__ == '__main__':
    # This is an example of how to use the function.
    # You would need an audio file (e.g., 'test_audio.m4a' or 'test_audio.wav') in the same directory.
    waveform_to_midi('Lights - Vocals Only (Acapella) _ Ellie Goulding.wav')
    # print("waveform_to_midi function is ready to be used with M4A, WAV, MP3 and other audio files.")
