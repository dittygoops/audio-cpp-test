#!/usr/bin/env python3
"""
Dual Instrument Recorder - Records guitar and flute separately, 
then combines into a single MIDI file for GarageBand import
"""

import os
import time
from datetime import datetime
from spotify_transcriber import AudioToMIDITranscriber
import pretty_midi

class DualInstrumentRecorder:
    def __init__(self, sample_rate=44100):
        """
        Initialize the dual instrument recorder
        
        Args:
            sample_rate (int): Audio sample rate (Hz)
        """
        self.sample_rate = sample_rate
        self.transcriber = AudioToMIDITranscriber(sample_rate=sample_rate)
        
    def record_instrument(self, instrument_name, duration=15):
        """
        Record a single instrument and convert to MIDI
        
        Args:
            instrument_name (str): Name of the instrument (e.g., "piano", "bass")
            duration (int): Recording duration in seconds
            
        Returns:
            tuple: (audio_file, midi_data, note_events)
        """
        print(f"\n=== Recording {instrument_name.upper()} ===")
        print(f"Recording for {duration} seconds...")
        print(f"Please play your {instrument_name} now!")
        
        # Record audio
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        audio_file = f"{instrument_name}_{timestamp}.wav"
        
        # Use the transcriber's record_audio method
        recorded_file = self.transcriber.record_audio(duration, audio_file)
        
        # Skip noise reduction - transcribe directly from original audio
        print("Skipping noise reduction - using original audio for transcription")
        
        # Detect pitches directly from original audio
        midi_data, note_events = self.transcriber.detect_pitches(recorded_file)
        
        print(f"✅ {instrument_name.capitalize()} recording complete!")
        print(f"   Audio: {recorded_file}")
        print(f"   Notes detected: {len(note_events)}")
        
        return recorded_file, midi_data, note_events
    
    def combine_midi_tracks(self, piano_midi, bass_midi, output_file):
        """
        Combine piano and bass MIDI data into a single file with separate tracks
        
        Args:
            piano_midi: Piano MIDI data (PrettyMIDI object)
            bass_midi: Bass MIDI data (PrettyMIDI object)
            output_file (str): Path for combined MIDI file
        """
        print(f"\n=== Combining MIDI Tracks ===")
        
        # Create a new MIDI file
        combined_midi = pretty_midi.PrettyMIDI()
        
        # Add piano track (track 0)
        if piano_midi and hasattr(piano_midi, 'instruments') and piano_midi.instruments:
            piano_track = pretty_midi.Instrument(program=0)  # Acoustic Grand Piano program
            piano_track.name = "Piano"
            
            for instrument in piano_midi.instruments:
                for note in instrument.notes:
                    piano_track.notes.append(note)
            
            combined_midi.instruments.append(piano_track)
            print(f"Added piano track with {len(piano_track.notes)} notes")
        
        # Add bass track (track 1)
        if bass_midi and hasattr(bass_midi, 'instruments') and bass_midi.instruments:
            bass_track = pretty_midi.Instrument(program=32)  # Acoustic Bass program
            bass_track.name = "Bass"
            
            for instrument in bass_midi.instruments:
                for note in instrument.notes:
                    bass_track.notes.append(note)
            
            combined_midi.instruments.append(bass_track)
            print(f"Added bass track with {len(bass_track.notes)} notes")
        
        # Save combined MIDI file
        combined_midi.write(output_file)
        print(f"✅ Combined MIDI saved to: {output_file}")
        
        return combined_midi
    
    def record_dual_instruments(self, duration=15):
        """
        Record both piano and bass, then combine into single MIDI file
        
        Args:
            duration (int): Recording duration for each instrument
            
        Returns:
            str: Path to combined MIDI file
        """
        try:
            print("=== Dual Instrument Recorder ===")
            print("This will record piano and bass separately, then combine them into one MIDI file.")
            print("The MIDI file will have two tracks that can be layered in GarageBand.")
            print()
            
            # Record piano
            piano_audio, piano_midi, piano_notes = self.record_instrument("piano", duration)
            
            # Wait between recordings
            print(f"\n⏳ Waiting 5 seconds before bass recording...")
            time.sleep(5)
            
            # Record bass
            bass_audio, bass_midi, bass_notes = self.record_instrument("bass", duration)
            
            # Combine MIDI tracks
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            combined_midi_file = f"piano_bass_combined_{timestamp}.mid"
            
            combined_midi = self.combine_midi_tracks(piano_midi, bass_midi, combined_midi_file)
            
            # Print final summary
            print(f"\n=== Recording Complete ===")
            print(f"Piano audio: {piano_audio}")
            print(f"Bass audio: {bass_audio}")
            print(f"Combined MIDI: {combined_midi_file}")
            print(f"Total piano notes: {len(piano_notes)}")
            print(f"Total bass notes: {len(bass_notes)}")
            print()
            print("🎵 You can now import the MIDI file into GarageBand!")
            print("   - Track 1: Piano (Acoustic Grand Piano)")
            print("   - Track 2: Bass (Acoustic Bass)")
            
            return combined_midi_file
            
        except Exception as e:
            print(f"❌ Error during recording: {e}")
            return None
        finally:
            self.transcriber.cleanup()

def main():
    """Main function"""
    print("=== Dual Instrument MIDI Recorder ===")
    print("Records piano and bass separately, combines into GarageBand-compatible MIDI")
    print()
    
    # Get recording duration from user
    try:
        duration = int(input("Enter recording duration for each instrument (seconds, default 15): ") or "15")
    except ValueError:
        duration = 15
        print("Using default duration: 15 seconds")
    
    # Create recorder
    recorder = DualInstrumentRecorder()
    
    try:
        # Record both instruments
        output_file = recorder.record_dual_instruments(duration)
        
        if output_file:
            print(f"\n✅ Success! Combined MIDI file: {output_file}")
        else:
            print("\n❌ Recording failed!")
            
    except KeyboardInterrupt:
        print("\n\nRecording cancelled by user")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    main()
