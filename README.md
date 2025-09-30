# 🎶 HarmonAI: Multi-Track Voice-to-MIDI Music Creator

HarmonAI is a full-stack application designed to empower musicians and producers by transforming raw audio input (voice or uploaded `.wav` files) into flexible, multi-track MIDI arrangements using advanced machine learning for pitch detection.

This project utilizes a robust Python/Flask backend for heavy-lifting audio processing and a responsive React/TypeScript frontend for sequencing, playback, and composition.

## ✨ Features

* **Audio Input:** Capture live microphone input or upload `.wav` files for processing.

* **ML-Powered Pitch Processing:** The backend performs batch processing of audio files, utilizing machine learning models and mathematical techniques, including [Spotify's `basic-pitch` library](https://github.com/spotify/basic-pitch), to accurately extract pitch and timing information and convert it into `.midi` format.

* **Multi-Track MIDI Editor:** The frontend provides a powerful interface for:

  * Loading multiple processed MIDI tracks.

  * Assigning various instruments (e.g., piano, drums, strings) to each track.

  * Combining and editing multiple MIDI sequences.

  * Real-time playback of the combined composition.

* **Export Capabilities:** Export the final, combined composition as a single `.midi` file or a high-quality `.wav` audio file.

* **Full-Stack Architecture:** Separated backend (Python/Flask) for data processing and a frontend (React/TypeScript) for a smooth, interactive user experience.

## 🛠️ Technologies Used

| Layer | Technology | Purpose | 
 | ----- | ----- | ----- | 
| **Backend** | Python, Flask | Handles API requests, audio file uploads, and batch processing. | 
| **ML/Audio** | `basic-pitch` | Core library for accurate pitch estimation and MIDI transcription. | 
| **Frontend** | React, TypeScript | Interactive UI, state management, and MIDI sequencing/playback. | 
| **Styling** | Tailwind CSS (Assumed) | Responsive and modern component styling. | 
| **MIDI Playback** | Tone.js or similar (Assumed) | Handling instrument loading and audio synthesis on the client side. | 

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### 1. Backend Setup (Python/Flask)

The backend is responsible for receiving audio, performing ML pitch detection, and returning the structured MIDI data.

1. Navigate to the backend directory:
cd backend


2. Install the required Python dependencies:

pip install -r requirements.txt


3. Run the Flask server:

python app.py


The backend server will run on `http://localhost:3000`.

### 2. Frontend Setup (React/TypeScript)

The frontend provides the user interface for recording, displaying tracks, editing, and playback.

1. Navigate to the frontend directory:

cd frontend


2. Install the JavaScript dependencies:

npm install


3. Run the development server:

npm run dev


The frontend application will now be available at `http://localhost:5173`.

## 🎤 Usage

1. Access the application via your browser at **`http://localhost:5173`**.

2. Use the interface to either record a vocal performance or upload a `.wav` file.

3. Submit the audio for processing. The frontend will send the file to the backend's ML pipeline (`:3000`).

4. Once the MIDI data is returned, it will appear as a new track in the sequencer.

5. Assign instruments to your tracks (e.g., Lead: Saxophone, Harmony: Flute).

6. Use the sequencer interface to combine, edit, and arrange the multiple MIDI tracks.

7. Click the "Play" button to hear your final composition.

## 💾 Exporting Your Music

Use the dedicated export buttons to save your work:

* **Export MIDI:** Saves the combined multi-track arrangement as a single standard `.midi` file.

* **Export WAV:** Renders the combined, instrument-assigned composition as a high-quality `.wav` audio file for distribution.
