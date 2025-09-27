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

class AudioToMIDITranscriber:
    def __init__(self, sample_rate=48000, chunk_size=1024, channels=1):
        """
        Initialize the transcriber with audio parameters
        
        Args:
            sample_rate (int): Audio sample rate (Hz)
            chunk_size (int): Number of frames per buffer
            channels (int): Number of audio channels
        """
        self.sample_rate = sample_rate
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
        Reduce background noise from audio file using noisereduce
        
        Args:
            audio_file (str): Path to input audio file
            output_file (str): Path to save noise-reduced audio (optional)
            
        Returns:
            str: Path to noise-reduced audio file
        """
        if output_file is None:
            # Create noise-reduced file in same directory
            base_name = os.path.splitext(audio_file)[0]
            output_file = f"{base_name}_noise_reduced.wav"
        
        print("Reducing background noise...")
        
        # Load audio file
        audio_data, sample_rate = librosa.load(audio_file, sr=self.sample_rate)
        
        # Perform noise reduction
        # First, we need to estimate the noise profile from the beginning of the audio
        # Use the first 0.5 seconds as noise sample
        noise_sample_length = int(0.5 * sample_rate)
        noise_sample = audio_data[:noise_sample_length]
        
        # Apply noise reduction
        reduced_noise = nr.reduce_noise(
            y=audio_data, 
            sr=sample_rate,
            y_noise=noise_sample,
            prop_decrease=0.8  # Reduce noise by 80%
        )
        
        # Save the noise-reduced audio
        import soundfile as sf
        sf.write(output_file, reduced_noise, sample_rate)
        
        print(f"Noise reduction complete! Saved to: {output_file}")
        return output_file
    
    def detect_pitches(self, audio_file):
        """
        Use basic-pitch to detect pitches in audio file
        
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
        
        # If we still don't have midi_data, try to create it from the result
        if midi_data is None:
            print("Warning: Could not extract MIDI data from result")
            # Create empty MIDI as fallback
            midi_data = pretty_midi.PrettyMIDI()
        
        # Extract note events from the MIDI data and boost velocity
        if hasattr(midi_data, 'instruments'):
            for instrument in midi_data.instruments:
                for note in instrument.notes:
                    # Boost velocity by 200% (3x original), but cap at 127 (MIDI max)
                    original_velocity = note.velocity
                    boosted_velocity = 127
                    note.velocity = boosted_velocity
                    
                    note_events.append({
                        'pitch': note.pitch,
                        'start': note.start,
                        'end': note.end,
                        'velocity': boosted_velocity
                    })
            
            print(f"MIDI has {len(midi_data.instruments)} instruments")
            total_notes = sum(len(instr.notes) for instr in midi_data.instruments)
            print(f"Total notes: {total_notes}")
        else:
            print("Warning: midi_data does not have instruments attribute")
            print(f"midi_data type: {type(midi_data)}")
            if hasattr(midi_data, '__dict__'):
                print(f"midi_data attributes: {list(midi_data.__dict__.keys())}")
        
        # Safety check for note_events
        if note_events is None:
            note_events = []
        elif not isinstance(note_events, (list, tuple)):
            note_events = []
        
        print(f"Detected {len(note_events)} note events")
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
            
            # Step 3: Detect pitches
            midi_data, note_events = self.detect_pitches(noise_reduced_file)
            
            # Step 4: Save MIDI
            if output_midi is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_midi = f"transcription_{timestamp}.mid"
            
            self.save_midi(midi_data, output_midi)
            
            # Keep the audio file in the current directory
            print(f"Audio file saved: {audio_file}")
            
            return output_midi
            
        except Exception as e:
            print(f"Error during transcription: {e}")
            return None
        finally:
            self.cleanup()

def main():
    """Main function with command line interface"""
    parser = argparse.ArgumentParser(description="Record audio and convert to MIDI using basic-pitch")
    parser.add_argument("--duration", "-d", type=int, default=10, 
                       help="Recording duration in seconds (default: 10)")
    parser.add_argument("--output", "-o", type=str, 
                       help="Output MIDI file path (default: auto-generated)")
    parser.add_argument("--sample-rate", "-r", type=int, default=48000,
                       help="Audio sample rate (default: 48000)")
    
    args = parser.parse_args()
    
    print("=== Audio to MIDI Transcriber ===")
    print("Using basic-pitch for pitch detection")
    print(f"Recording duration: {args.duration} seconds")
    print(f"Sample rate: {args.sample_rate} Hz")
    print()
    
    # Create transcriber
    transcriber = AudioToMIDITranscriber(sample_rate=args.sample_rate)
    
    try:
        # Perform transcription
        output_file = transcriber.transcribe_live(
            duration=args.duration,
            output_midi=args.output
        )
        
        if output_file:
            print(f"\n✅ Transcription complete! MIDI file: {output_file}")
        else:
            print("\n❌ Transcription failed!")
            
    except KeyboardInterrupt:
        print("\n\nTranscription cancelled by user")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    main()