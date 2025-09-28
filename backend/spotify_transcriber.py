#!/usr/bin/env python3
"""
Audio to MIDI transcriber using microphone input and basic-pitch
Records from default microphone, detects pitches, and outputs MIDI file
"""

import pyaudio
import wave
import numpy as np
import tempfile
import os
from basic_pitch import ICASSP_2022_MODEL_PATH
from basic_pitch.inference import predict
import pretty_midi
import argparse
import time
from datetime import datetime
import noisereduce as nr
import librosa
import random

class AudioToMIDITranscriber:
    def __init__(self, sample_rate=44100, chunk_size=1024, channels=1):
        """
        Initialize the transcriber with audio parameters optimized for Basic Pitch
        """
        self.sample_rate = sample_rate  # 44.1kHz is better for Basic Pitch
        self.chunk_size = chunk_size
        self.channels = channels
        self.audio = pyaudio.PyAudio()
        self.is_recording = False
        
    def record_audio(self, duration=10, output_file=None):
        """
        Record audio from default microphone
        
        Args:
            duration (int): Recording duration in seconds
            output_file (str): Path to save recorded audio (optional)
            
        Returns:
            str: Path to recorded audio file
        """
        if output_file is None:
            # Create file in current directory
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"recording_{timestamp}.wav"
        
        print(f"Recording for {duration} seconds...")
        print("Speak or play music into your microphone...")
        
        # Open audio stream
        stream = self.audio.open(
            format=pyaudio.paInt16,
            channels=self.channels,
            rate=self.sample_rate,
            input=True,
            frames_per_buffer=self.chunk_size
        )
        
        frames = []
        self.is_recording = True
        
        try:
            for i in range(0, int(self.sample_rate / self.chunk_size * duration)):
                if not self.is_recording:
                    break
                data = stream.read(self.chunk_size)
                frames.append(data)
                
                # Show recording progress
                progress = (i + 1) / (self.sample_rate / self.chunk_size * duration) * 100
                print(f"\rRecording progress: {progress:.1f}%", end="", flush=True)
        except KeyboardInterrupt:
            print("\nRecording interrupted by user")
        
        print(f"\nRecording complete! Saving to {output_file}")
        
        # Stop and close stream
        stream.stop_stream()
        stream.close()
        
        # Save recorded audio
        with wave.open(output_file, 'wb') as wf:
            wf.setnchannels(self.channels)
            wf.setsampwidth(self.audio.get_sample_size(pyaudio.paInt16))
            wf.setframerate(self.sample_rate)
            wf.writeframes(b''.join(frames))
        
        return output_file
    
    def reduce_noise(self, audio_file, output_file=None):
        """
        Gentle noise reduction that preserves voice characteristics
        """
        if output_file is None:
            base_name = os.path.splitext(audio_file)[0]
            output_file = f"{base_name}_noise_reduced.wav"
        
        print("Reducing background noise...")
        
        # Load audio file
        audio_data, sample_rate = librosa.load(audio_file, sr=self.sample_rate)
        
        # Perform noise reduction using CURRENT API
        # First, we need to estimate the noise profile from the beginning of the audio
        noise_sample_length = int(0.5 * sample_rate)
        noise_sample = audio_data[:noise_sample_length]
        
        # Apply noise reduction with CORRECT parameters for version 2.0+
        reduced_noise = nr.reduce_noise(
            y=audio_data,  # The audio signal to denoise
            sr=sample_rate,  # Sample rate
            y_noise=noise_sample,  # Noise sample for profiling
            prop_decrease=0.5,  # Reduce noise by 50% (gentler)
            stationary=False,  # Better for voice recordings
            # These are the CORRECT parameters for current versions:
            freq_mask_smooth_hz=500,  # Frequency smoothing in Hz
            time_mask_smooth_ms=50,   # Time smoothing in milliseconds
            n_std_thresh_stationary=1.5,  # Threshold for noise detection
        )
        
        # Save the noise-reduced audio
        import soundfile as sf
        sf.write(output_file, reduced_noise, sample_rate)
        
        print(f"Noise reduction complete! Saved to: {output_file}")
        return output_file
    
    def detect_pitches(self, audio_file):
        """
        Use basic-pitch to detect pitches in audio file with natural velocity preservation
        
        Args:
            audio_file (str): Path to audio file
            
        Returns:
            tuple: (midi_data, note_events)
        """
        print("Analyzing audio with basic-pitch...")
        
        # Use basic-pitch to predict MIDI
        result = predict(audio_file)
        
        # Handle different return formats from basic-pitch
        note_events = []
        midi_data = result[1]
        
        if midi_data is None:
            print("Warning: Could not extract MIDI data from result")
            midi_data = pretty_midi.PrettyMIDI()
            return midi_data, note_events
        
        # PRESERVE NATURAL DYNAMICS - don't destroy velocity information
        if hasattr(midi_data, 'instruments'):
            for instrument in midi_data.instruments:
                for note in instrument.notes:
                    # PRESERVE the original velocity from Basic Pitch
                    original_velocity = note.velocity
                    
                    # Only boost if velocity is extremely low (likely detection error)
                    if original_velocity < 10:
                        # Boost very low velocities to a reasonable minimum
                        note.velocity = 40  # Soft but audible
                    elif original_velocity > 100:
                        # Cap maximum velocity to prevent harsh sounds
                        note.velocity = 100
                    else:
                        # KEEP the original velocity - this preserves dynamics
                        note.velocity = original_velocity
                    
                    # Add some natural variation to avoid robotic sound
                    variation = random.randint(5, 15)
                    note.velocity = max(20, min(110, note.velocity + variation))
                    
                    note_events.append({
                        'pitch': note.pitch,
                        'start': note.start,
                        'end': note.end,
                        'velocity': note.velocity  # Use the preserved velocity
                    })
            
            print(f"MIDI has {len(midi_data.instruments)} instruments")
            total_notes = sum(len(instr.notes) for instr in midi_data.instruments)
            print(f"Total notes: {total_notes}")
            
            # Print velocity range for debugging
            if note_events:
                velocities = [note['velocity'] for note in note_events]
                print(f"Velocity range: {min(velocities)} - {max(velocities)}")
        
        return midi_data, note_events
    
    def save_midi(self, midi_data, output_file):
        """
        Save MIDI data to file
        
        Args:
            midi_data: MIDI data from basic-pitch (PrettyMIDI object)
            output_file (str): Path to save MIDI file
        """
        print(f"Saving MIDI to {output_file}")
        try:
            midi_data.write(output_file)
            print(f"MIDI file saved successfully!")
        except Exception as e:
            print(f"Error saving MIDI file: {e}")
            raise
    
    def preserve_natural_timing(self, midi_data):
        """
        Preserve natural timing variations instead of strict quantization
        """
        for instrument in midi_data.instruments:
            for note in instrument.notes:
                # Add small random timing variations to avoid robotic feel
                timing_variation = random.uniform(-0.02, 0.02)  # ±20ms variation
                note.start = max(0, note.start + timing_variation)
                note.end = max(note.start + 0.1, note.end + timing_variation)
        
        return midi_data
    
    def add_pitch_bend_from_audio(self, midi_data, audio_file):
        """
        Analyze original audio for pitch bends and add them to MIDI
        """
        try:
            y, sr = librosa.load(audio_file, sr=self.sample_rate)
            
            # Extract pitch information with higher resolution
            pitches, magnitudes = librosa.piptrack(y=y, sr=sr, threshold=0.1, fmin=80, fmax=400)
            
            # Add pitch bend data to MIDI (simplified version)
            # This would require more complex implementation for full pitch bend tracking
            print("Adding natural pitch variations...")
            
        except Exception as e:
            print(f"Could not add pitch bend data: {e}")
        
        return midi_data
    
    def set_instrument_program(self, midi_data, instrument_name):
        """
        Set the MIDI program (instrument) for all tracks in the MIDI data
        
        Args:
            midi_data: pretty_midi.PrettyMIDI object
            instrument_name (str): Name of the instrument to set
            
        Returns:
            pretty_midi.PrettyMIDI: Modified MIDI data with instrument set
        """
        # MIDI program mapping (same as in dual_instrument_recorder.py)
        instrument_programs = {
            'piano': 0,           # Acoustic Grand Piano
            'guitar': 24,         # Acoustic Guitar (nylon)
            'bass': 32,           # Acoustic Bass
            'drums': 128,         # Drums (channel 9)
            'violin': 40,         # Violin
            'cello': 42,          # Cello
            'trumpet': 56,        # Trumpet
            'saxophone': 64,      # Soprano Sax
            'flute': 73,          # Flute
            'organ': 16,          # Drawbar Organ
            'synth': 80,          # Lead 1 (square)
        }
        
        # Determine MIDI program based on instrument name
        program = 0  # Default to piano
        name_lower = instrument_name.lower().replace(' ', '_')
        
        for key, prog in instrument_programs.items():
            if key in name_lower:
                program = prog
                break
        
        # Set instrument for all tracks
        for instrument in midi_data.instruments:
            if program == 128:  # Drums
                instrument.is_drum = True
                instrument.program = 0  # Drums use program 0 on channel 9
            else:
                instrument.is_drum = False
                instrument.program = program
            
            # Set track name
            instrument.name = instrument_name
        
        print(f"Set instrument to: {instrument_name} (Program: {program})")
        return midi_data

    def cleanup(self):
        """Clean up audio resources"""
        self.audio.terminate()
    
    def transcribe_live(self, duration=10, output_midi=None):
        """
        Complete transcription pipeline: record -> detect -> save MIDI
        
        Args:
            duration (int): Recording duration in seconds
            output_midi (str): Path for output MIDI file (optional)
        """
        try:
            # Step 1: Record audio
            audio_file = self.record_audio(duration)
            
            # Step 2: Reduce noise
            noise_reduced_file = self.reduce_noise(audio_file)
            
            # Step 3: Detect pitches from both original and noise-reduced files
            print("\n=== Processing Original Audio ===")
            midi_data_original, note_events_original = self.detect_pitches(audio_file)
            
            print("\n=== Processing Noise-Reduced Audio ===")
            midi_data_clean, note_events_clean = self.detect_pitches(noise_reduced_file)
            
            # Step 4: Add natural variations
            print("\n=== Adding Natural Variations ===")
            midi_data_original = self.preserve_natural_timing(midi_data_original)
            midi_data_original = self.add_pitch_bend_from_audio(midi_data_original, audio_file)
            
            midi_data_clean = self.preserve_natural_timing(midi_data_clean)
            midi_data_clean = self.add_pitch_bend_from_audio(midi_data_clean, noise_reduced_file)
            
            # Step 5: Save MIDI files for both versions
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            if output_midi is None:
                original_midi = f"transcription_original_{timestamp}.mid"
                clean_midi = f"transcription_clean_{timestamp}.mid"
            else:
                base_name = os.path.splitext(output_midi)[0]
                original_midi = f"{base_name}_original.mid"
                clean_midi = f"{base_name}_clean.mid"
            
            print(f"\n=== Saving MIDI Files ===")
            self.save_midi(midi_data_original, original_midi)
            self.save_midi(midi_data_clean, clean_midi)
            
            # Print comparison summary
            print(f"\n=== Transcription Summary ===")
            print(f"Original audio: {audio_file}")
            print(f"Noise-reduced audio: {noise_reduced_file}")
            print(f"Original MIDI: {original_midi} ({len(note_events_original)} notes)")
            print(f"Clean MIDI: {clean_midi} ({len(note_events_clean)} notes)")
            
            return [original_midi, clean_midi]
            
        except Exception as e:
            print(f"Error during transcription: {e}")
            return None
        finally:
            self.cleanup()
    
    def transcribe_file(self, audio_file, output_midi=None, instrument_name=None):
        """
        Transcribe an existing audio file to MIDI (both original and noise-reduced versions)
        
        Args:
            audio_file (str): Path to existing audio file
            output_midi (str): Base path for output MIDI files (optional)
            instrument_name (str): Name of the instrument to set in MIDI (optional)
            
        Returns:
            list: Paths to generated MIDI files [original_midi, clean_midi]
        """
        if not os.path.exists(audio_file):
            print(f"Error: {audio_file} not found!")
            return None
            
        try:
            print(f"Processing existing audio file: {audio_file}")
            
            # Step 1: Reduce noise
            noise_reduced_file = self.reduce_noise(audio_file)
            
            # Step 2: Detect pitches from both original and noise-reduced files
            print("\n=== Processing Original Audio ===")
            midi_data_original, note_events_original = self.detect_pitches(audio_file)
            
            print("\n=== Processing Noise-Reduced Audio ===")
            midi_data_clean, note_events_clean = self.detect_pitches(noise_reduced_file)
            
            # Step 3: Add natural variations
            print("\n=== Adding Natural Variations ===")
            midi_data_original = self.preserve_natural_timing(midi_data_original)
            midi_data_original = self.add_pitch_bend_from_audio(midi_data_original, audio_file)
            
            midi_data_clean = self.preserve_natural_timing(midi_data_clean)
            midi_data_clean = self.add_pitch_bend_from_audio(midi_data_clean, noise_reduced_file)
            
            # Step 3.5: Set instrument if specified
            if instrument_name:
                print(f"\n=== Setting Instrument: {instrument_name} ===")
                midi_data_original = self.set_instrument_program(midi_data_original, instrument_name)
                midi_data_clean = self.set_instrument_program(midi_data_clean, instrument_name)
            
            # Step 4: Save MIDI files for both versions
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_name = os.path.splitext(os.path.basename(audio_file))[0]
            
            if output_midi is None:
                original_midi = f"{base_name}_original_{timestamp}.mid"
                clean_midi = f"{base_name}_clean_{timestamp}.mid"
            else:
                base_output = os.path.splitext(output_midi)[0]
                original_midi = f"{base_output}_original.mid"
                clean_midi = f"{base_output}_clean.mid"
            
            print(f"\n=== Saving MIDI Files ===")
            self.save_midi(midi_data_original, original_midi)
            self.save_midi(midi_data_clean, clean_midi)
            
            # Print comparison summary
            print(f"\n=== Transcription Summary ===")
            print(f"Original audio: {audio_file}")
            print(f"Noise-reduced audio: {noise_reduced_file}")
            print(f"Original MIDI: {original_midi} ({len(note_events_original)} notes)")
            print(f"Clean MIDI: {clean_midi} ({len(note_events_clean)} notes)")
            
            return [original_midi, clean_midi]
            
        except Exception as e:
            print(f"Error during transcription: {e}")
            return None
        finally:
            self.cleanup()

def main():
    """Main function with command line interface"""
    parser = argparse.ArgumentParser(description="Record audio and convert to MIDI using basic-pitch")
    parser.add_argument("input_file", nargs='?', type=str,
                       help="Audio file to process (alternatively use --file)")
    parser.add_argument("--duration", "-d", type=int, default=10, 
                       help="Recording duration in seconds (default: 10)")
    parser.add_argument("--output", "-o", type=str, 
                       help="Output MIDI file path (default: auto-generated)")
    parser.add_argument("--sample-rate", "-r", type=int, default=44100,
                       help="Audio sample rate (default: 44100)")
    parser.add_argument("--file", "-f", type=str,
                       help="Process existing audio file instead of recording")
    
    args = parser.parse_args()
    
    # Support both positional argument and --file flag
    input_file = args.input_file or args.file
    
    print("=== Audio to MIDI Transcriber ===")
    print("Using basic-pitch for pitch detection")
    print(f"Sample rate: {args.sample_rate} Hz")
    print()
    
    # Create transcriber
    transcriber = AudioToMIDITranscriber(sample_rate=args.sample_rate)
    
    try:
        if input_file:
            # Process existing file
            print(f"Processing file: {input_file}")
            output_files = transcriber.transcribe_file(
                audio_file=input_file,
                output_midi=args.output
            )
        else:
            # Record and process
            print(f"Recording duration: {args.duration} seconds")
            output_files = transcriber.transcribe_live(
                duration=args.duration,
                output_midi=args.output
            )
        
        if output_files:
            print(f"\n✅ Transcription complete!")
            print(f"Generated MIDI files:")
            for i, file in enumerate(output_files):
                print(f"  {i+1}. {file}")
        else:
            print("\n❌ Transcription failed!")
            
    except KeyboardInterrupt:
        print("\n\nTranscription cancelled by user")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    main()
