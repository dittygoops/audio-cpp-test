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
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'flac', 'm4a'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB max file size
PORT = 3001

# Vercel blob storage configuration
VERCEL_BLOB_READ_WRITE_TOKEN = os.getenv('VERCEL_BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_Ny9jzcJeQEq6rfQQ_y3TEv1ypf9JzmNmdh62hT4bOYEh4bO')
VERCEL_BLOB_BASE_URL = os.getenv('VERCEL_BLOB_BASE_URL', 'https://ny9jzcjeqeq6rfqq.public.blob.vercel-storage.com')

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
    Expects a JSON payload with audioUrl pointing to a Vercel blob storage URL
    Downloads the audio, converts to MIDI, and returns the MIDI file directly
    """
    temp_audio_path = None
    midi_files_to_cleanup = []
    
    try:
        # Get JSON payload
        data = request.get_json()
        if not data or 'audioUrl' not in data:
            return jsonify({'error': 'No audioUrl provided in request body'}), 400
        
        audio_url = data['audioUrl']
        
        print(f"Processing audio from URL: {audio_url}")
        
        # Download the audio file from the blob URL
        timestamp = int(time.time() * 1000)
        
        try:
            print("Downloading audio file from blob storage...")
            response = requests.get(audio_url, timeout=30)
            response.raise_for_status()
            
            # Determine file extension from URL or content-type
            file_extension = '.wav'  # Default
            if audio_url.lower().endswith(('.mp3', '.wav', '.flac', '.m4a')):
                file_extension = audio_url[audio_url.rfind('.'):].lower()
            
            # Save to temporary file
            temp_audio_path = os.path.join(tempfile.gettempdir(), f"{timestamp}_audio{file_extension}")
            
            with open(temp_audio_path, 'wb') as f:
                f.write(response.content)
            
            print(f"Downloaded audio file: {len(response.content)} bytes")
            
        except requests.exceptions.RequestException as e:
            return jsonify({
                'success': False,
                'error': 'Failed to download audio file from URL',
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
