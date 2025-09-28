import { useState, useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';

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
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const synthRef = useRef<Tone.PolySynth | null>(null);
  const midiRef = useRef<Midi | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize Tone.js synth
  useEffect(() => {
    const initializeSynth = async () => {
      try {
        // Create a polyphonic synthesizer
        synthRef.current = new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: "triangle"
          },
          envelope: {
            attack: 0.02,
            decay: 0.1,
            sustain: 0.3,
            release: 1
          }
        }).toDestination();

        // Set initial volume
        synthRef.current.volume.value = Tone.gainToDb(volume);
      } catch (error) {
        console.error('Error initializing synthesizer:', error);
      }
    };

    initializeSynth();

    return () => {
      // Cleanup
      if (synthRef.current) {
        synthRef.current.dispose();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Load MIDI file when path changes
  useEffect(() => {
    const loadMidiFile = async () => {
      if (!midiPath) {
        midiRef.current = null;
        setDuration(0);
        setCurrentTime(0);
        setLoadError(null);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        // Construct the full URL for the MIDI file
        // If midiPath is just a filename, prepend the uploads URL
        const fullUrl = midiPath.startsWith('http') 
          ? midiPath 
          : `http://localhost:3001/uploads/${midiPath}`;
        
        console.log('Loading MIDI from:', fullUrl);
        
        // Fetch the MIDI file
        const response = await fetch(fullUrl);
        console.log('Response status:', response.status, response.statusText);
        console.log('Response content-type:', response.headers.get('content-type'));
        
        if (!response.ok) {
          throw new Error(`Failed to load MIDI file: ${response.statusText}`);
        }

        // Check if we received a MIDI file or HTML error page
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          throw new Error('Received HTML instead of MIDI file. Check if the file exists on the server.');
        }

        const arrayBuffer = await response.arrayBuffer();
        const midi = new Midi(arrayBuffer);
        
        midiRef.current = midi;
        setDuration(midi.duration);
        setCurrentTime(0);
        
        console.log('MIDI loaded successfully:', {
          url: fullUrl,
          duration: midi.duration,
          tracks: midi.tracks.length,
          name: midi.name
        });
      } catch (error) {
        console.error('Error loading MIDI file:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load MIDI file');
        midiRef.current = null;
        setDuration(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadMidiFile();
  }, [midiPath]);

  // Update volume when changed
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.volume.value = Tone.gainToDb(volume);
    }
  }, [volume]);

  const scheduleNotes = useCallback(() => {
    if (!midiRef.current || !synthRef.current) return;

    // Clear any existing scheduled events
    Tone.Transport.cancel();

    // Schedule all notes from all tracks
    midiRef.current.tracks.forEach((track) => {
      track.notes.forEach((note) => {
        Tone.Transport.schedule((time) => {
          synthRef.current?.triggerAttackRelease(
            note.name,
            note.duration,
            time,
            note.velocity
          );
        }, note.time);
      });
    });
  }, []);

  const handlePlay = async () => {
    if (!midiPath || disabled || !midiRef.current || !synthRef.current) return;

    try {
      // Initialize audio context if needed
      if (!isInitializedRef.current) {
        await Tone.start();
        isInitializedRef.current = true;
      }

      if (isPlaying) {
        // Pause
        Tone.Transport.pause();
        setIsPlaying(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        onPause?.();
      } else {
        // Play
        if (currentTime === 0) {
          // Starting from beginning - schedule all notes
          scheduleNotes();
          Tone.Transport.position = 0;
        } else {
          // Resuming from where we paused
          Tone.Transport.position = currentTime;
        }

        Tone.Transport.start();
        setIsPlaying(true);

        // Update progress
        intervalRef.current = setInterval(() => {
          const position = Tone.Transport.seconds;
          setCurrentTime(position);

          if (position >= duration) {
            handleStop();
          }
        }, 100);

        onPlay?.();
      }
    } catch (error) {
      console.error('Error playing MIDI:', error);
      setLoadError('Failed to play MIDI file. Please try again.');
    }
  };


  const handleStop = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
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
      <div className="flex flex-col items-center p-4 border border-gray-700 rounded-lg bg-gray-800">
        <div className="text-gray-400 mb-2">
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
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        </div>
        <p className="text-gray-400 text-sm text-center">
          No MIDI file available
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center p-4 border border-gray-700 rounded-lg bg-gray-800">
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
            className="mx-auto animate-pulse"
          >
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        </div>
        <p className="text-gray-300 text-sm text-center">
          Loading MIDI file...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center p-4 border border-red-700 rounded-lg bg-red-900/50">
        <div className="text-red-400 mb-2">
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
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <path d="M12 9v4"></path>
            <path d="m12 17 .01 0"></path>
          </svg>
        </div>
        <p className="text-red-300 text-sm text-center">
          {loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-800">
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
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        </div>
        <div className="text-sm text-gray-300">
          MIDI: {midiPath.split('/').pop()}
        </div>
        {midiRef.current && (
          <div className="text-xs text-gray-400 mt-1">
            {midiRef.current.tracks.length} track(s), {formatTime(duration)} duration
          </div>
        )}
      </div>

      {/* Progress Bar */}
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
          disabled={disabled || (!isPlaying && currentTime === 0)}
          className="p-2 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
          onClick={handlePlay}
          disabled={disabled || !midiRef.current}
          className={`p-3 rounded-full font-semibold text-white transition-colors ${
            isPlaying
              ? 'bg-orange-600 hover:bg-orange-700'
              : 'bg-green-600 hover:bg-green-700'
          } ${disabled || !midiRef.current ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isPlaying ? (
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
        <div className="text-gray-300">
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
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </div>
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
        {midiRef.current ? 'Click play to hear your MIDI file' : 'Loading MIDI data...'}
      </div>
    </div>
  );
};

export default MidiPlayer;