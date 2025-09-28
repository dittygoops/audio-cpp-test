#!/usr/bin/env python3
"""
Main Flask application for audio-to-MIDI conversion service.
Integrates all audio processing functionality from the existing scripts.
"""

import os
import shutil
import tempfile
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
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'flac', 'm4a'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB max file size
PORT = 3001

# Vercel blob storage configuration
VERCEL_BLOB_READ_WRITE_TOKEN = os.getenv('VERCEL_BLOB_READ_WRITE_TOKEN')
VERCEL_BLOB_BASE_URL = os.getenv('VERCEL_BLOB_BASE_URL')

# Set the Vercel blob token for the library
os.environ['BLOB_READ_WRITE_TOKEN'] = VERCEL_BLOB_READ_WRITE_TOKEN

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
            '/api/transcribe-dual',
            '/api/health'
        ]
    })
#ROUTE THAT IS ACTUALLY USED 
@app.route('/api/transcribe-single', methods=['POST'])
def transcribe_single():
    """
    Route for spotify_transcriber.py functionality - single audio file to MIDI conversion
    Uploads generated MIDI files to Vercel blob storage and returns blob URLs
    """
    temp_audio_path = None
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        if audio_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(audio_file.filename):
            return jsonify({'error': 'File type not allowed. Use WAV, MP3, FLAC, or M4A'}), 400
        
        # Save the uploaded file temporarily for processing
        timestamp = int(time.time() * 1000)
        filename = secure_filename(audio_file.filename)
        temp_audio_path = os.path.join(tempfile.gettempdir(), f"{timestamp}_{filename}")
        audio_file.save(temp_audio_path)
        
        print(f"Processing single audio file: {filename}")
        
        # Create transcriber and process the file
        transcriber = AudioToMIDITranscriber()
        
        try:
            # Use transcribe_file method which returns list of MIDI files
            output_files = transcriber.transcribe_file(temp_audio_path)
            
            if output_files and len(output_files) > 0:
                # Upload MIDI files to Vercel blob storage
                blob_urls = []
                blob_files = []
                
                for i, midi_file in enumerate(output_files):
                    if os.path.exists(midi_file):
                        # Read the MIDI file
                        with open(midi_file, 'rb') as f:
                            midi_data = f.read()
                        
                        # Create a unique filename for blob storage
                        midi_basename = os.path.basename(midi_file)
                        blob_filename = f"transcriptions/{timestamp}_{midi_basename}"
                        
                        # Upload to Vercel blob storage
                        print(f"Uploading {midi_basename} to blob storage...")
                        blob_response = put(blob_filename, midi_data)
                        
                        blob_url = blob_response.get('url')
                        if blob_url:
                            blob_urls.append(blob_url)
                            blob_files.append(blob_filename)
                            print(f"Successfully uploaded: {blob_url}")
                        
                        # Clean up temporary MIDI file
                        os.remove(midi_file)
                
                if blob_urls:
                    return jsonify({
                        'success': True,
                        'message': 'Single audio transcription completed successfully',
                        'inputFile': filename,
                        'midiFiles': blob_files,
                        'midiUrls': blob_urls,
                        'originalMidiUrl': blob_urls[0] if len(blob_urls) > 0 else None,
                        'cleanMidiUrl': blob_urls[1] if len(blob_urls) > 1 else None,
                        # Keep original format for compatibility
                        'originalMidi': blob_files[0] if len(blob_files) > 0 else None,
                        'cleanMidi': blob_files[1] if len(blob_files) > 1 else None
                    })
                else:
                    return jsonify({
                        'success': False,
                        'error': 'Failed to upload MIDI files to blob storage'
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
        # Clean up temporary audio file
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
            except Exception as e:
                print(f"Warning: Could not remove temporary file {temp_audio_path}: {e}")



#ROUTE THAT IS ACTUALLY USED 

@app.route('/api/transcribe-dual', methods=['POST'])
def transcribe_dual():
    """
    Route for dual_instrument_recorder.py functionality - process two instruments
    """
    try:
        # Expect two audio files: piano and bass
        if 'piano' not in request.files or 'bass' not in request.files:
            return jsonify({'error': 'Both piano and bass audio files required'}), 400
        
        piano_file = request.files['piano']
        bass_file = request.files['bass']
        
        if piano_file.filename == '' or bass_file.filename == '':
            return jsonify({'error': 'Both files must be selected'}), 400
        
        if not (allowed_file(piano_file.filename) and allowed_file(bass_file.filename)):
            return jsonify({'error': 'File types not allowed. Use WAV, MP3, FLAC, or M4A'}), 400
        
        # Save both uploaded files
        timestamp = int(time.time() * 1000)
        piano_filename = secure_filename(piano_file.filename)
        bass_filename = secure_filename(bass_file.filename)
        
        piano_path = os.path.join(UPLOAD_FOLDER, f"{timestamp}_piano_{piano_filename}")
        bass_path = os.path.join(UPLOAD_FOLDER, f"{timestamp}_bass_{bass_filename}")
        
        piano_file.save(piano_path)
        bass_file.save(bass_path)
        
        print(f"Processing dual instruments - Piano: {piano_filename}, Bass: {bass_filename}")
        
        # Create dual instrument recorder and process files
        recorder = DualInstrumentRecorder()
        
        try:
            # Process both files and combine
            combined_midi_file = recorder.process_dual_files(piano_path, bass_path)
            
            if combined_midi_file and os.path.exists(combined_midi_file):
                # Move combined MIDI to upload folder for serving
                served_name = f"{timestamp}_dual_combined.mid"
                served_path = os.path.join(UPLOAD_FOLDER, served_name)
                shutil.move(combined_midi_file, served_path)
                
                return jsonify({
                    'success': True,
                    'message': 'Dual instrument transcription completed successfully',
                    'pianoFile': piano_filename,
                    'bassFile': bass_filename,
                    'combinedMidi': served_name
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Failed to generate combined MIDI file'
                }), 500
                
        except Exception as e:
            print(f"Error during dual transcription: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Dual transcription failed',
                'details': str(e)
            }), 500
        finally:
            recorder.transcriber.cleanup()
    
    except Exception as e:
        print(f"Error in transcribe_dual: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to process dual instrument files',
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
    print(f"Vercel blob storage: {VERCEL_BLOB_BASE_URL}")
    print(f"Health check: http://localhost:{PORT}/api/health")
    print("\nAvailable routes:")
    print(f"  POST /api/transcribe-single - Single audio file to MIDI (outputs to Vercel blob storage)")
    print(f"  POST /api/transcribe-vocals  - Vocals-only processing") 
    print(f"  POST /api/transcribe-dual    - Dual instrument processing")
    print(f"  GET  /api/health            - Health check")
    print(f"  GET  /uploads/<filename>    - Serve generated files")
    
    app.run(host='0.0.0.0', port=PORT, debug=True)
