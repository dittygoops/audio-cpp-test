# Music Creator - Audio to MIDI Web Application

A modern web application for recording audio tracks and converting them to MIDI files, with the ability to combine multiple tracks into a single MIDI composition.

## Features

- 🎵 **Multi-track Recording**: Record up to 15-second audio clips
- 🎹 **Instrument Selection**: Choose from 8 different MIDI instruments
- 🎼 **Real-time Conversion**: Convert audio to MIDI using AI-powered transcription
- 🎧 **MIDI Playback**: Preview converted MIDI files in the browser
- 🔄 **Re-recording**: Easily re-record any track
- 📥 **Download**: Download individual MIDI files or combined compositions
- 🎨 **Modern UI**: Beautiful, responsive interface with smooth animations

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and building
- **Lucide React** for beautiful icons
- **Modern CSS** with gradients and animations

### Backend
- **Node.js** with Express
- **Multer** for file uploads
- **Python Integration** for audio processing
- **Basic Pitch** for AI-powered audio-to-MIDI conversion

## Prerequisites

- Node.js (v16 or higher)
- Python 3.8 or higher
- npm or yarn

## Installation

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   ```

## Running the Application

### Start the Backend Server
```bash
cd backend
npm start
```
The backend will run on `http://localhost:3001`

### Start the Frontend Development Server
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:5173`

## Usage

1. **Open the application** in your browser at `http://localhost:5173`
2. **Select an instrument** for your first track
3. **Click "Record"** to start a 15-second recording
4. **Wait for conversion** - the audio will be automatically converted to MIDI
5. **Preview the MIDI** by clicking the play button
6. **Add more tracks** using the "+" button
7. **Combine all tracks** when you're ready to create your final composition
8. **Download** the combined MIDI file

## Project Structure

```
audio-midi/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── Track.tsx    # Individual track component
│   │   │   ├── TrackList.tsx # Track management component
│   │   │   └── index.ts     # Component exports
│   │   ├── App.tsx          # Main application component
│   │   └── App.css          # Application styles
│   └── package.json
├── backend/                  # Node.js backend
│   ├── server.js            # Express server with API endpoints
│   └── package.json
├── spotify_transcriber.py   # Python audio-to-MIDI conversion
└── requirements.txt          # Python dependencies
```

## API Endpoints

- `POST /api/convert-to-midi` - Convert WAV audio to MIDI
- `POST /api/combine-midi` - Combine multiple MIDI files
- `GET /api/health` - Health check endpoint
- `GET /uploads/*` - Serve MIDI files

## Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

**Note**: Audio recording requires HTTPS in production or localhost for development.

## Troubleshooting

### Audio Recording Issues
- Ensure microphone permissions are granted
- Use HTTPS in production environments
- Check browser console for permission errors

### Conversion Issues
- Verify Python dependencies are installed
- Check backend logs for conversion errors
- Ensure audio file format is supported (WAV)

### MIDI Playback Issues
- Some browsers may require additional MIDI plugins
- Check browser console for audio playback errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details