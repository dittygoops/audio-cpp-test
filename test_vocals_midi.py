#!/usr/bin/env python3
"""
Test script to process the vocals-only .wav file through pitch detection
and output MIDI using functions from spotify_transcriber.py
"""

import os
from spotify_transcriber import AudioToMIDITranscriber
from datetime import datetime

def test_vocals_to_midi():
    """Test processing vocals-only file to MIDI"""
    
    # Input file
    vocals_file = "Lights - Vocals Only (Acapella) _ Ellie Goulding.wav"
    
    # Check if file exists
    if not os.path.exists(vocals_file):
        print(f"Error: {vocals_file} not found!")
        return None
    
    print("=== Testing Vocals to MIDI Conversion ===")
    print(f"Input file: {vocals_file}")
    
    # Create transcriber instance
    transcriber = AudioToMIDITranscriber()
    
    try:
        # Step 1: Reduce noise (optional but recommended)
        print("\n1. Reducing background noise...")
        noise_reduced_file = transcriber.reduce_noise(vocals_file)
        
        # Step 2: Detect pitches using basic-pitch
        print("\n2. Detecting pitches with basic-pitch...")
        midi_data, note_events = transcriber.detect_pitches(noise_reduced_file)
        
        # Step 3: Save MIDI file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_midi = f"ellie_goulding_vocals_{timestamp}.mid"
        
        print(f"\n3. Saving MIDI to {output_midi}...")
        transcriber.save_midi(midi_data, output_midi)
        
        # Print summary
        print(f"\n✅ Conversion complete!")
        print(f"Input: {vocals_file}")
        print(f"Noise-reduced: {noise_reduced_file}")
        print(f"MIDI output: {output_midi}")
        print(f"Total notes detected: {len(note_events)}")
        
        return output_midi
        
    except Exception as e:
        print(f"\n❌ Error during conversion: {e}")
        return None
    finally:
        transcriber.cleanup()

if __name__ == "__main__":
    test_vocals_to_midi()
