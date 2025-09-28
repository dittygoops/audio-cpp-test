import { useState, useEffect } from 'react';
import Track from './Track';

interface TrackListProps {
  onMidiFilesChange?: (midiFiles: string[]) => void;
}

const TrackList: React.FC<TrackListProps> = ({ onMidiFilesChange }) => {
  const [tracks, setTracks] = useState<string[]>(['track-1']);
  const [midiFiles, setMidiFiles] = useState<string[]>([]);

  const addTrack = () => {
    const newTrackId = `track-${Date.now()}`;
    setTracks(prev => [...prev, newTrackId]);
  };

  const removeTrack = (trackId: string) => {
    setTracks(prev => prev.filter(id => id !== trackId));
    // Also remove any associated MIDI files
    setMidiFiles(prev => prev.filter(path => !path.includes(trackId)));
  };

  const handleMidiGenerated = (midiPath: string) => {
    setMidiFiles(prev => {
      // Remove any existing entry for this track
      const filtered = prev.filter(path => !path.includes(midiPath.split('/').pop()?.split('-')[0] || ''));
      return [...filtered, midiPath];
    });
  };

  // Notify parent component when midiFiles change
  useEffect(() => {
    onMidiFilesChange?.(midiFiles);
  }, [midiFiles, onMidiFilesChange]);

  const canCombine = midiFiles.length >= 2;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Music Tracks</h2>
        <button
          onClick={addTrack}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <span>+</span>
          <span>Add Track</span>
        </button>
      </div>

      {tracks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">🎵</div>
          <p className="text-gray-600 mb-4">No tracks yet. Add your first track to get started!</p>
          <button
            onClick={addTrack}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add First Track
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {tracks.map((trackId, index) => (
            <Track
              key={trackId}
              trackId={trackId}
              trackNumber={index + 1}
              onRemove={tracks.length > 1 ? () => removeTrack(trackId) : undefined}
              onMidiGenerated={handleMidiGenerated}
            />
          ))}
        </div>
      )}

      {midiFiles.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Generated MIDI Files ({midiFiles.length})
          </h3>
          <div className="space-y-1">
            {midiFiles.map((midiPath, index) => (
              <div key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                <span>🎵</span>
                <span>{midiPath.split('/').pop()}</span>
              </div>
            ))}
          </div>
          {midiFiles.length < 2 && (
            <p className="text-sm text-gray-500 mt-2">
              Add at least one more track to combine MIDI files
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackList;
