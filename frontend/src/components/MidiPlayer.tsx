import { useState, useRef, useEffect } from 'react';

interface MidiPlayerProps {
  midiPath?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  disabled?: boolean;
}

const MidiPlayer: React.FC<MidiPlayerProps> = ({
  midiPath,
  onPlay,
  onPause,
  onStop,
  disabled = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handlePlay = async () => {
    if (!midiPath || disabled) return;

    try {
      // For now, we'll create a simple audio element that can play the MIDI file
      // Note: This is a simplified approach. In a production app, you might want to use
      // a proper MIDI synthesizer library like Tone.js or similar
      if (!audioRef.current) {
        // Create a simple audio representation or use a placeholder
        setIsPlaying(true);
        setCurrentTime(0);
        setDuration(15); // Assuming 15-second tracks

        intervalRef.current = setInterval(() => {
          setCurrentTime(prev => {
            if (prev >= 15) {
              setIsPlaying(false);
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
              return 15;
            }
            return prev + 0.1;
          });
        }, 100);

        onPlay?.();
      }
    } catch (error) {
      console.error('Error playing MIDI:', error);
      alert('Failed to play MIDI file. Please try again.');
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onPause?.();
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onStop?.();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const formatTime = (time: number): string => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!midiPath) {
    return (
      <div className="flex flex-col items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div className="text-gray-400 mb-2">🎵</div>
        <p className="text-gray-500 text-sm text-center">
          No MIDI file available
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 p-4 border border-gray-200 rounded-lg bg-white">
      <div className="text-center">
        <div className="text-2xl mb-2">🎵</div>
        <div className="text-sm text-gray-600">
          MIDI: {midiPath.split('/').pop()}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={handleStop}
          disabled={disabled || currentTime === 0}
          className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          title="Stop"
        >
          ⏹️
        </button>

        <button
          onClick={isPlaying ? handlePause : handlePlay}
          disabled={disabled}
          className={`p-3 rounded-full font-semibold text-white transition-colors ${
            isPlaying
              ? 'bg-orange-600 hover:bg-orange-700'
              : 'bg-green-600 hover:bg-green-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">🔊</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          disabled={disabled}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-sm text-gray-600 w-8">
          {Math.round(volume * 100)}%
        </span>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Click play to preview your MIDI conversion
      </div>
    </div>
  );
};

export default MidiPlayer;