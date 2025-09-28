#!/usr/bin/env python3
"""
Main Flask application for audio-to-MIDI conversion service.
Integrates all audio processing functionality from the existing scripts.
"""

import os
import shutil
import tempfile
import requests
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import time
from datetime import datetime
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Vercel blob storage
from vercel_blob import put, delete

# Import our existing audio processing modules
from spotify_transcriber import AudioToMIDITranscriber
from dual_instrument_recorder import DualInstrumentRecorder
import test_vocals_midi

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mid', 'midi'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB max file size
PORT = 3001

# Vercel blob storage configuration


# Set the Vercel blob token for the library


# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if the uploaded file has an allowed extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'message': 'Audio-to-MIDI Flask server is running',
        'available_routes': [
            '/api/transcribe-single',
            '/api/transcribe-vocals', 
            '/api/combine-midi',
            '/api/health'
        ]
    })
#ROUTE THAT IS ACTUALLY USED 
@app.route('/api/transcribe-single', methods=['POST'])
def transcribe_single():
    """
    Route for spotify_transcriber.py functionality - single audio file to MIDI conversion
    Expects a .wav audio file in the request
    Converts to MIDI and returns the MIDI file directly
    """
    temp_audio_path = None
    midi_files_to_cleanup = []
    
    try:
        # Check if audio file was uploaded
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'error': 'No audio file selected'}), 400
        
        # Check if it's a valid audio file
        if not audio_file.filename.lower().endswith('.wav'):
            return jsonify({'error': 'Only .wav files are supported'}), 400
        
        print(f"Processing audio file: {audio_file.filename}")
        
        # Save the uploaded file to a temporary location
        timestamp = int(time.time() * 1000)
        temp_audio_path = os.path.join(tempfile.gettempdir(), f"{timestamp}_audio.wav")
        
        try:
            audio_file.save(temp_audio_path)
            print(f"Saved audio file: {temp_audio_path}")
            
            # Verify file was saved and has content
            if not os.path.exists(temp_audio_path) or os.path.getsize(temp_audio_path) == 0:
                return jsonify({
                    'success': False,
                    'error': 'Failed to save audio file or file is empty'
                }), 400
            
            print(f"Audio file size: {os.path.getsize(temp_audio_path)} bytes")
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': 'Failed to save audio file',
                'details': str(e)
            }), 400
        
        # Create transcriber and process the file
        transcriber = AudioToMIDITranscriber()
        
        try:
            # Use transcribe_file method which returns list of MIDI files
            output_files = transcriber.transcribe_file(temp_audio_path)
            
            if output_files and len(output_files) > 0:
                # Use the clean MIDI file (second one) if available, otherwise use the first
                primary_midi_file = output_files[1] if len(output_files) > 1 else output_files[0]
                midi_files_to_cleanup = output_files
                
                if os.path.exists(primary_midi_file):
                    print(f"Returning MIDI file: {primary_midi_file}")
                    
                    # Return the MIDI file directly as a downloadable file
                    return send_file(
                        primary_midi_file,
                        as_attachment=True,
                        download_name=f"transcribed_{timestamp}.mid",
                        mimetype='audio/midi'
                    )
                else:
                    return jsonify({
                        'success': False,
                        'error': 'Generated MIDI file not found'
                    }), 500
            else:
                return jsonify({
                    'success': False,
                    'error': 'Failed to generate MIDI files'
                }), 500
                
        except Exception as e:
            print(f"Error during transcription: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Transcription failed',
                'details': str(e)
            }), 500
        finally:
            transcriber.cleanup()
    
    except Exception as e:
        print(f"Error in transcribe_single: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to process audio file',
            'details': str(e)
        }), 500
    finally:
        # Clean up temporary files
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
                print(f"Cleaned up temporary audio file: {temp_audio_path}")
            except Exception as e:
                print(f"Warning: Could not remove temporary audio file {temp_audio_path}: {e}")
        
        # Clean up MIDI files after sending
        for midi_file in midi_files_to_cleanup:
            if os.path.exists(midi_file):
                try:
                    os.remove(midi_file)
                    print(f"Cleaned up MIDI file: {midi_file}")
                except Exception as e:
                    print(f"Warning: Could not remove MIDI file {midi_file}: {e}")



#ROUTE THAT IS ACTUALLY USED 

@app.route('/api/combine-midi', methods=['POST'])
def combine_midi():
    """
    Route for combining multiple existing MIDI files into a single multi-track MIDI file
    """
    try:
        # Check if any files were uploaded
        if not request.files:
            return jsonify({'error': 'No MIDI files provided'}), 400
        
        # Get all uploaded files
        uploaded_files = []
        file_paths = []
        file_names = []
        timestamp = int(time.time() * 1000)
        
        for key, file in request.files.items():
            if file and file.filename != '':
                if not allowed_file(file.filename):
                    return jsonify({'error': f'File type not allowed for {file.filename}. Use MID or MIDI'}), 400
                
                # Save the file
                filename = secure_filename(file.filename)
                file_path = os.path.join(UPLOAD_FOLDER, f"{timestamp}_{key}_{filename}")
                file.save(file_path)
                
                uploaded_files.append(file)
                file_paths.append(file_path)
                file_names.append(filename)
        
        if len(uploaded_files) == 0:
            return jsonify({'error': 'No valid files uploaded'}), 400
        
        print(f"Processing {len(uploaded_files)} MIDI files for combination")
        for i, name in enumerate(file_names):
            print(f"  File {i+1}: {name}")
        
        # Create dual instrument recorder and process files
        recorder = DualInstrumentRecorder()
        
        try:
            # Combine existing MIDI files directly (no transcription)
            combined_midi_file = recorder.combine_existing_midi_files(file_paths, list(request.files.keys()))
            
            if combined_midi_file and os.path.exists(combined_midi_file):
                # Return the combined MIDI file directly
                download_name = f"{timestamp}_combined.mid"
                return send_file(
                    combined_midi_file,
                    as_attachment=True,
                    download_name=download_name,
                    mimetype='audio/midi'
                )
            else:
                return jsonify({
                    'success': False,
                    'error': 'Failed to generate combined MIDI file'
                }), 500
                
        except Exception as e:
            print(f"Error during multi transcription: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Multi transcription failed',
                'details': str(e)
            }), 500
        finally:
            recorder.transcriber.cleanup()
    
    except Exception as e:
        print(f"Error in combine_midi: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to process multiple instrument files',
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
            elif filename.lower().endswith('.mp3'):
                mimetype = 'audio/mpeg'
            
            return send_file(file_path, mimetype=mimetype)
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        print(f"Error serving file {filename}: {str(e)}")
        return jsonify({'error': 'Failed to serve file'}), 500

# Error handlers
@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large. Maximum size is 16MB.'}), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print(f"Starting Audio-to-MIDI Flask server on port {PORT}")
    print(f"Temporary upload folder: {UPLOAD_FOLDER}")
    print(f"Max file size: {MAX_FILE_SIZE / (1024*1024):.1f}MB")
   
    print(f"Health check: http://localhost:{PORT}/api/health")
    print("\nAvailable routes:")
    print(f"  POST /api/transcribe-single - Single audio file to MIDI (outputs to Vercel blob storage)")
    print(f"  POST /api/transcribe-vocals  - Vocals-only processing") 
    print(f"  POST /api/combine-midi      - Combine multiple audio files into single MIDI")
    print(f"  GET  /api/health            - Health check")
    print(f"  GET  /uploads/<filename>    - Serve generated files")
    
    app.run(host='0.0.0.0', port=PORT, debug=True)
