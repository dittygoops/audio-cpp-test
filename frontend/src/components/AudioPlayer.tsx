import { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  audioPath?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  disabled?: boolean;
  title?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioPath,
  onPlay,
  onPause,
  onStop,
  disabled = false,
  title = "Audio Preview",
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioPath && audioRef.current) {
      const audio = audioRef.current;
      audio.src = `http://localhost:3001/uploads/${audioPath}`;
      
      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
        setIsLoading(false);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        onStop?.();
      };

      const handleLoadStart = () => {
        setIsLoading(true);
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('loadstart', handleLoadStart);

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('loadstart', handleLoadStart);
      };
    }
  }, [audioPath, onStop]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handlePlay = async () => {
    if (!audioPath || disabled || !audioRef.current) return;

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      onPlay?.();
    } catch (error) {
      console.error('Error playing audio:', error);
      alert('Failed to play audio file. Please try again.');
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      onPause?.();
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
      onStop?.();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = parseFloat(e.target.value);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number): string => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!audioPath) {
    return (
      <div className="flex flex-col items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div className="text-gray-400 mb-2">🔊</div>
        <p className="text-gray-500 text-sm text-center">
          No audio file available
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 p-4 border border-gray-200 rounded-lg bg-white">
      <audio
        ref={audioRef}
        preload="metadata"
        style={{ display: 'none' }}
      />
      
      <div className="text-center">
        <div className="text-2xl mb-2">🔊</div>
        <div className="text-sm text-gray-600 font-medium">
          {title}
        </div>
        <div className="text-xs text-gray-500">
          {audioPath.split('/').pop()}
        </div>
      </div>

      {/* Progress Bar / Seek Bar */}
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          disabled={disabled || !duration}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progress}%, #e5e7eb ${progress}%, #e5e7eb 100%)`
          }}
        />
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
          disabled={disabled || isLoading}
          className={`p-3 rounded-full font-semibold text-white transition-colors ${
            isPlaying
              ? 'bg-orange-600 hover:bg-orange-700'
              : 'bg-green-600 hover:bg-green-700'
          } ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? '⏳' : isPlaying ? '⏸️' : '▶️'}
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
        Click play to listen to your combined audio
      </div>
    </div>
  );
};

export default AudioPlayer;
