import { useState, useEffect, useRef } from 'react';
import Track from './Track';

interface TrackListProps {
  onMidiFilesChange?: (midiFiles: string[]) => void;
}

const TrackList: React.FC<TrackListProps> = ({ onMidiFilesChange }) => {
  const [tracks, setTracks] = useState<string[]>(['track-1', 'track-2']);
  const [midiFiles, setMidiFiles] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const trackListRef = useRef<HTMLDivElement>(null);

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

  // Intersection Observer for scroll-triggered animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px 0px -50px 0px'
      }
    );

    if (trackListRef.current) {
      observer.observe(trackListRef.current);
    }

    return () => {
      if (trackListRef.current) {
        observer.unobserve(trackListRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={trackListRef}
      className={`space-y-6 transition-all duration-1000 ${
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-12'
      }`}
    >
      <div 
        className={`flex items-center justify-between transition-all duration-800 delay-200 ${
          isVisible 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform translate-y-8'
        }`}
      >
        <h2 className="text-2xl font-bold text-white">Music Tracks</h2>
        <button
          onClick={addTrack}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <span>+</span>
          <span>Add Track</span>
        </button>
      </div>

      {tracks.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/20 backdrop-blur-sm border border-gray-700/30 rounded-lg">
          <div className="text-blue-400 mb-4">
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="mx-auto"
            >
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
          </div>
          <p className="text-gray-300 mb-4">No tracks yet. Add your first track to get started!</p>
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
            <div
              key={trackId}
              className={`transition-all duration-700 ${
                isVisible 
                  ? 'opacity-100 transform translate-y-0' 
                  : 'opacity-0 transform translate-y-8'
              }`}
              style={{ 
                transitionDelay: `${400 + index * 200}ms` 
              }}
            >
              <Track
                trackId={trackId}
                trackNumber={index + 1}
                onRemove={tracks.length > 1 ? () => removeTrack(trackId) : undefined}
                onMidiGenerated={handleMidiGenerated}
              />
            </div>
          ))}
        </div>
      )}

      {midiFiles.length > 0 && (
        <div 
          className={`mt-8 p-4 bg-gray-800/20 backdrop-blur-sm border border-gray-700/30 rounded-lg transition-all duration-800 ${
            isVisible 
              ? 'opacity-100 transform translate-y-0' 
              : 'opacity-0 transform translate-y-8'
          }`}
          style={{ 
            transitionDelay: `${600 + tracks.length * 200}ms` 
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-2">
            Generated MIDI Files ({midiFiles.length})
          </h3>
          <div className="space-y-1">
            {midiFiles.map((midiPath, index) => (
              <div key={index} className="text-sm text-gray-300 flex items-center space-x-2">
                <div className="text-blue-400">
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                  </svg>
                </div>
                <span>{midiPath.split('/').pop()}</span>
              </div>
            ))}
          </div>
          {midiFiles.length < 2 && (
            <p className="text-sm text-gray-400 mt-2">
              Add at least one more track to combine MIDI files
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackList;
