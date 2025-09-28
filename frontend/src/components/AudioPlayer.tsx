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

  const formatTime = (time: number): string => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!audioPath) {
    return (
      <div className="flex flex-col items-center p-4 border border-gray-700 rounded-lg bg-gray-800">
        <div className="text-gray-400 mb-2">🔊</div>
        <p className="text-gray-400 text-sm text-center">
          No audio file available
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-800">
      <audio
        ref={audioRef}
        preload="metadata"
        style={{ display: 'none' }}
      />
      
      <div className="text-center">
        <div className="text-blue-400 mb-2">
          <svg 
            width="32" 
            height="32" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="mx-auto"
          >
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </div>
        <div className="text-sm text-gray-300 font-medium">
          {title}
        </div>
        <div className="text-xs text-gray-400">
          {audioPath.split('/').pop()}
        </div>
      </div>

      {/* Progress Bar / Seek Bar */}
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-2">
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
          className="p-2 text-gray-300 hover:text-white disabled:opacity-50"
          title="Stop"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <rect x="6" y="6" width="12" height="12" rx="2"></rect>
          </svg>
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
          {isLoading ? (
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-spin"
            >
              <path d="M21 12a9 9 0 11-6.219-8.56"></path>
            </svg>
          ) : isPlaying ? (
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          ) : (
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <polygon points="5,3 19,12 5,21"></polygon>
            </svg>
          )}
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-300">🔊</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          disabled={disabled}
          className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
        />
        <span className="text-sm text-gray-300 w-8">
          {Math.round(volume * 100)}%
        </span>
      </div>

      <div className="text-xs text-gray-400 text-center">
        Click play to listen to your combined audio
      </div>
    </div>
  );
};

export default AudioPlayer;
