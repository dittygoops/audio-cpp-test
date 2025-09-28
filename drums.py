#!/usr/bin/env python3
"""
Convert percussive mouth recordings into MIDI drum notes.
- One recording for snare (pah / tss sounds)
- One recording for cymbal (tshhh sounds)
Each produces its own .mid file you can import into GarageBand.
"""

import librosa
import pretty_midi
import numpy as np

# Map instrument names to General MIDI drum note numbers
DRUM_MAP = {
    "snare": 38,   # Acoustic Snare
    "cymbal": 49   # Crash Cymbal 1 (could also use 42/46 for hi-hats)
}

def audio_to_drum_midi(audio_file, instrument="snare", velocity=90, output_midi="drums.mid"):
    """
    Convert a percussive recording (snare or cymbal) into a MIDI file.
    
    Args:
        audio_file (str): Path to .wav recording
        instrument (str): "snare" or "cymbal"
        velocity (int): MIDI velocity (default: 90, constant loudness)
        output_midi (str): Output MIDI file path
    
    Returns:
        str: Path to saved MIDI file
    """
    if instrument not in DRUM_MAP:
        raise ValueError(f"Invalid instrument: {instrument}. Choose from {list(DRUM_MAP.keys())}")

    midi_note = DRUM_MAP[instrument]

    # Load audio
    y, sr = librosa.load(audio_file, sr=None)

    # Onset detection (find percussive hits)
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr, units="frames", backtrack=False, delta=0.2)
    onset_times = librosa.frames_to_time(onset_frames, sr=sr)

    # Create MIDI object
    midi_data = pretty_midi.PrettyMIDI()
    drum = pretty_midi.Instrument(program=0, is_drum=True)

    for t in onset_times:
        note = pretty_midi.Note(
            velocity=velocity,
            pitch=midi_note,
            start=t,
            end=t + (0.3 if instrument == "cymbal" else 0.2)  # cymbals ring longer
        )
        drum.notes.append(note)

    midi_data.instruments.append(drum)
    midi_data.write(output_midi)

    print(f"Saved {instrument} MIDI with {len(onset_times)} hits → {output_midi}")
    return output_midi


if __name__ == "__main__":
    # Example usage:
    # Make sure snare.wav and cymbal.wav exist in the same folder as this script
    
    # Convert snare recording
    audio_to_drum_midi("snare.wav", instrument="snare", output_midi="snare.mid")

    # Convert cymbal recording
    audio_to_drum_midi("cymbal.wav", instrument="cymbal", output_midi="cymbal.mid")
