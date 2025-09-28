from basic_pitch.inference import predict
from basic_pitch import midi

# Load your audio file (WAV, MP3, etc.)
audio_path = 'Lights - Vocals Only (Acapella) _ Ellie Goulding.wav'
output_midi_path = 'output_final.mid'

# Run prediction
model_output, midi_data, note_events = predict(audio_path)

# Save MIDI file
midi.save(midi_data, output_midi_path)
print(f"MIDI file saved to {output_midi_path}")