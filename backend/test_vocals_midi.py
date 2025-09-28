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
    vocals_file = "bass_20250927_160637_noise_reduced (1).wav"
    
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

def process_vocals_file(vocals_file_path):
    """
    Process a vocals file to MIDI - function version for Flask integration
    
    Args:
        vocals_file_path (str): Path to the vocals audio file
        
    Returns:
        list: List of generated MIDI file paths, or None if failed
    """
    # Check if file exists
    if not os.path.exists(vocals_file_path):
        print(f"Error: {vocals_file_path} not found!")
        return None
    
    print("=== Processing Vocals to MIDI ===")
    print(f"Input file: {vocals_file_path}")
    
    # Create transcriber instance
    transcriber = AudioToMIDITranscriber()
    
    try:
        # Use the transcribe_file method that processes both original and noise-reduced versions
        output_files = transcriber.transcribe_file(vocals_file_path)
        
        if output_files:
            print(f"\n✅ Vocals conversion complete!")
            print(f"Generated MIDI files:")
            for i, file in enumerate(output_files):
                print(f"  {i+1}. {file}")
            return output_files
        else:
            print("\n❌ Vocals conversion failed!")
            return None
        
    except Exception as e:
        print(f"\n❌ Error during vocals conversion: {e}")
        return None
    finally:
        transcriber.cleanup()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test vocals to MIDI conversion")
    parser.add_argument("input_file", nargs='?', type=str,
                       help="Vocals audio file to process")
    
    args = parser.parse_args()
    
    if args.input_file:
        # Process specified file
        result = process_vocals_file(args.input_file)
        if result:
            print(f"\n✅ Success! Generated {len(result)} MIDI files")
        else:
            print("\n❌ Processing failed!")
    else:
        # Use hardcoded test file
        test_vocals_to_midi()
