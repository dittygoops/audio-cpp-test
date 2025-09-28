#!/usr/bin/env python3
"""
Mock backend server for testing the music creation frontend.
Takes in WAV files and returns the hardcoded Ellie Goulding MIDI file.
"""

import os
import shutil
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import time

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
MOCK_MIDI_FILE = 'ellie_goulding_vocals_20250927_133544.mid'
PORT = 3001

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'message': 'Mock backend server is running'
    })

@app.route('/api/convert-to-midi', methods=['POST'])
def convert_to_midi():
    """
    Mock endpoint that accepts a WAV file and returns the hardcoded MIDI file.
    """
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        instrument = request.form.get('instrument', '0')
        
        if audio_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save the uploaded WAV file (though we won't actually process it)
        timestamp = int(time.time() * 1000)
        wav_filename = f"recording_{timestamp}.wav"
        wav_path = os.path.join(UPLOAD_FOLDER, wav_filename)
        audio_file.save(wav_path)
        
        print(f"Received WAV file: {wav_filename}, instrument: {instrument}")
        
        # Create a mock MIDI filename
        midi_filename = f"midi_{timestamp}.mid"
        midi_path = os.path.join(UPLOAD_FOLDER, midi_filename)
        
        # Copy the hardcoded Ellie Goulding MIDI file to the new filename
        if os.path.exists(MOCK_MIDI_FILE):
            shutil.copy2(MOCK_MIDI_FILE, midi_path)
            print(f"Mock MIDI file created: {midi_filename}")
            
            return jsonify({
                'success': True,
                'message': 'Conversion completed successfully',
                'midiPath': midi_filename
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Mock MIDI file not found: {MOCK_MIDI_FILE}'
            }), 500
    
    except Exception as e:
        print(f"Error in convert_to_midi: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to convert audio to MIDI',
            'details': str(e)
        }), 500

@app.route('/api/combine-midi', methods=['POST'])
def combine_midi():
    """
    Mock endpoint that combines MIDI files.
    Returns both a hardcoded WAV file and MIDI file as the combined result.
    """
    try:
        data = request.get_json()
        midi_paths = data.get('midiPaths', [])
        
        if not midi_paths or len(midi_paths) < 2:
            return jsonify({'error': 'At least 2 MIDI file paths required'}), 400
        
        print(f"Combining {len(midi_paths)} MIDI files: {midi_paths}")
        
        # Create mock combined filenames
        timestamp = int(time.time() * 1000)
        combined_midi_filename = f"combined_{timestamp}.mid"
        combined_wav_filename = f"combined_{timestamp}.wav"
        
        combined_midi_path = os.path.join(UPLOAD_FOLDER, combined_midi_filename)
        combined_wav_path = os.path.join(UPLOAD_FOLDER, combined_wav_filename)
        
        # Find available hardcoded files to use as mock combined result
        hardcoded_midi = MOCK_MIDI_FILE  # ellie_goulding_vocals_20250927_133544.mid
        hardcoded_wav_options = [
            'Lights - Vocals Only (Acapella) _ Ellie Goulding.wav',
            'Lights - Vocals Only (Acapella) _ Ellie Goulding_noise_reduced.wav',
            'bass_20250927_160637.wav',
            'piano_20250927_160621.wav'
        ]
        
        # Find the first available WAV file
        hardcoded_wav = None
        for wav_file in hardcoded_wav_options:
            if os.path.exists(wav_file):
                hardcoded_wav = wav_file
                break
        
        # Copy the hardcoded MIDI file as the "combined" result
        if os.path.exists(hardcoded_midi):
            shutil.copy2(hardcoded_midi, combined_midi_path)
            print(f"Mock combined MIDI file created: {combined_midi_filename}")
        else:
            return jsonify({
                'success': False,
                'error': f'Mock MIDI file not found: {hardcoded_midi}'
            }), 500
        
        # Copy a hardcoded WAV file as the "combined" audio result
        if hardcoded_wav and os.path.exists(hardcoded_wav):
            shutil.copy2(hardcoded_wav, combined_wav_path)
            print(f"Mock combined WAV file created: {combined_wav_filename}")
        else:
            print("Warning: No hardcoded WAV file found, proceeding with MIDI only")
            combined_wav_filename = None
        
        response_data = {
            'success': True,
            'message': 'MIDI files combined successfully',
            'combinedPath': combined_midi_filename,
            'combinedMidiPath': combined_midi_filename,
        }
        
        # Add WAV path if available
        if combined_wav_filename:
            response_data['combinedWavPath'] = combined_wav_filename
        
        return jsonify(response_data)
    
    except Exception as e:
        print(f"Error in combine_midi: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to combine MIDI files',
            'details': str(e)
        }), 500

@app.route('/uploads/<filename>')
def serve_file(filename):
    """Serve uploaded files (WAV and MIDI)"""
    try:
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            # Set appropriate content type based on file extension
            mimetype = None
            if filename.lower().endswith('.mid') or filename.lower().endswith('.midi'):
                mimetype = 'audio/midi'
            elif filename.lower().endswith('.wav'):
                mimetype = 'audio/wav'
            
            return send_file(file_path, mimetype=mimetype)
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        print(f"Error serving file {filename}: {str(e)}")
        return jsonify({'error': 'Failed to serve file'}), 500

if __name__ == '__main__':
    print(f"Starting mock backend server on port {PORT}")
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Mock MIDI file: {MOCK_MIDI_FILE}")
    print(f"Health check: http://localhost:{PORT}/api/health")
    
    # Check if the mock MIDI file exists
    if os.path.exists(MOCK_MIDI_FILE):
        print(f"✅ Mock MIDI file found: {MOCK_MIDI_FILE}")
    else:
        print(f"⚠️  Mock MIDI file not found: {MOCK_MIDI_FILE}")
        print("   The server will still run, but conversions will fail.")
    
    app.run(host='0.0.0.0', port=PORT, debug=True)
