# Audio to MIDI Transcriber

A Python application that records audio from your default microphone, uses Spotify's basic-pitch model for pitch detection, and outputs a MIDI file.

## Features

- Records audio from default microphone using PyAudio
- Uses Spotify's basic-pitch model for accurate pitch detection
- Converts detected pitches to MIDI format
- Command-line interface with customizable parameters
- Automatic cleanup of temporary files

## Installation

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

2. For macOS users, you may need to install PortAudio first:
```bash
brew install portaudio
```

## Usage

### Basic Usage
```bash
python spotify_transcriber.py
```
This will record for 10 seconds and create a MIDI file with a timestamp.

### Advanced Usage
```bash
# Record for 30 seconds and specify output file
python spotify_transcriber.py --duration 30 --output my_recording.mid

# Use different sample rate
python spotify_transcriber.py --sample-rate 44100 --duration 15
```

### Command Line Options

- `--duration, -d`: Recording duration in seconds (default: 10)
- `--output, -o`: Output MIDI file path (default: auto-generated with timestamp)
- `--sample-rate, -r`: Audio sample rate in Hz (default: 22050)

## How It Works

1. **Audio Recording**: Uses PyAudio to record from your default microphone
2. **Pitch Detection**: Uses Spotify's basic-pitch model to analyze the audio and detect pitches
3. **MIDI Conversion**: Converts detected pitches to MIDI format using pretty_midi
4. **File Output**: Saves the MIDI file to disk

## Requirements

- Python 3.7+
- Microphone access
- Internet connection (for downloading basic-pitch model on first run)

## Notes

- The basic-pitch model will be downloaded automatically on first use
- Temporary audio files are automatically cleaned up after processing
- The script shows recording progress and provides feedback during processing
- Press Ctrl+C to interrupt recording if needed
