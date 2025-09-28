import { useState } from 'react';
import TrackList from './components/TrackList';
import MidiPlayer from './components/MidiPlayer';
import AudioPlayer from './components/AudioPlayer';
import { combineMidiFiles, downloadMidiFile } from './services/api';
import './App.css';

function App() {
  const [isCombining, setIsCombining] = useState(false);
  const [combineError, setCombineError] = useState<string>('');
  const [combinedMidiPath, setCombinedMidiPath] = useState<string>('');
  const [combinedWavPath, setCombinedWavPath] = useState<string>('');
  const [midiFiles, setMidiFiles] = useState<string[]>([]);

  const handleCombineMidi = async () => {
    if (midiFiles.length < 2) {
      setCombineError('Need at least 2 MIDI files to combine');
      return;
    }

    setIsCombining(true);
    setCombineError('');

    try {
      const result = await combineMidiFiles(midiFiles);

      if (result.success && (result.combinedPath || result.combinedMidiPath)) {
        setCombinedMidiPath(result.combinedMidiPath || result.combinedPath || '');
        setCombinedWavPath(result.combinedWavPath || '');
      } else {
        setCombineError(result.error || 'Failed to combine MIDI files');
      }
    } catch (error) {
      setCombineError('Failed to combine MIDI files. Please try again.');
    } finally {
      setIsCombining(false);
    }
  };

  const handleDownload = async () => {
    if (combinedMidiPath) {
      try {
        await downloadMidiFile(combinedMidiPath);
      } catch (error) {
        setCombineError('Failed to download combined MIDI file');
      }
    }
  };

  const handleMidiFilesUpdate = (files: string[]) => {
    setMidiFiles(prevFiles => {
      // Only clear combined files if the number of files decreased (tracks were removed)
      // or if this is a significant change in the file list
      if (files.length < prevFiles.length) {
        setCombinedMidiPath('');
        setCombinedWavPath('');
        setCombineError('');
      }
      return files;
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🎵</div>
              <h1 className="text-xl font-bold text-gray-900">
                Music Creation Studio
              </h1>
            </div>
            <div className="text-sm text-gray-600">
              Create music with AI-powered MIDI conversion
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              How to Create Music
            </h2>
            <ol className="list-decimal list-inside text-blue-800 space-y-1">
              <li>Click "Add Track" to create a new track</li>
              <li>Select an instrument for each track</li>
              <li>Click "Start Recording" and play your instrument for 15 seconds</li>
              <li>Wait for the AI to convert your recording to MIDI</li>
              <li>Preview your MIDI track using the play button</li>
              <li>Add more tracks and repeat the process</li>
              <li>Click "Combine MIDI Files" to merge all tracks</li>
              <li>Download your combined MIDI composition</li>
            </ol>
          </div>

          {/* Track List */}
          <TrackList onMidiFilesChange={handleMidiFilesUpdate} />

          {/* Combine Section */}
          {midiFiles.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Combine MIDI Files
              </h3>

              {combineError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700">{combineError}</p>
                </div>
              )}

              {combinedMidiPath && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-green-700 font-medium">
                      MIDI files combined successfully!
                    </span>
                  </div>
                  <div className="text-green-600 text-sm mt-1 space-y-1">
                    <p>MIDI File: {combinedMidiPath.split('/').pop()}</p>
                    {combinedWavPath && (
                      <p>Audio File: {combinedWavPath.split('/').pop()}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-4">
                <button
                  onClick={handleCombineMidi}
                  disabled={midiFiles.length < 2 || isCombining}
                  className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                    midiFiles.length >= 2 && !isCombining
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isCombining ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin">⟳</div>
                      <span>Combining...</span>
                    </div>
                  ) : (
                    'Combine MIDI Files'
                  )}
                </button>

                {combinedMidiPath && (
                  <div className="flex space-x-3">
                    <button
                      onClick={handleDownload}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <span>⬇️</span>
                      <span>Download MIDI</span>
                    </button>
                    {combinedWavPath && (
                      <button
                        onClick={() => downloadMidiFile(combinedWavPath)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <span>⬇️</span>
                        <span>Download Audio</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {midiFiles.length < 2 && (
                <p className="text-sm text-gray-600 mt-2">
                  You need at least 2 MIDI files to combine them
                </p>
              )}

              {/* Combined File Players */}
              {(combinedMidiPath || combinedWavPath) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    Preview Combined Files
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* MIDI Player */}
                    {combinedMidiPath && (
                      <div>
                        <h5 className="text-md font-medium text-gray-700 mb-2">
                          MIDI Preview
                        </h5>
                        <MidiPlayer
                          midiPath={combinedMidiPath}
                          disabled={false}
                        />
                      </div>
                    )}

                    {/* Audio Player */}
                    {combinedWavPath && (
                      <div>
                        <h5 className="text-md font-medium text-gray-700 mb-2">
                          Audio Preview
                        </h5>
                        <AudioPlayer
                          audioPath={combinedWavPath}
                          disabled={false}
                          title="Combined Audio"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-600">
            Built with React, Tailwind CSS, and AI-powered MIDI conversion
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
