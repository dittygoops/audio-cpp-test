#!/usr/bin/env python3
"""
Test script to process the vocals-only .wav file through pitch detection
and output MIDI using functions from spotify_transcriber.py
"""

import os
from spotify_transcriber import AudioToMIDITranscriber

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
        # Use the new transcribe_file method that processes both original and noise-reduced versions
        output_files = transcriber.transcribe_file(vocals_file)
        
        if output_files:
            print(f"\n✅ Conversion complete!")
            print(f"Generated MIDI files:")
            for i, file in enumerate(output_files):
                print(f"  {i+1}. {file}")
            return output_files
        else:
            print("\n❌ Conversion failed!")
            return None
        
    except Exception as e:
        print(f"\n❌ Error during conversion: {e}")
        return None

if __name__ == "__main__":
    test_vocals_to_midi()
