import { useState, useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';

interface Track {
  id: string;
  synth: Tone.PolySynth | Tone.NoiseSynth | null;
  part: Tone.Part | null;
  notes: any[];
  instrument: string;
  volume: number;
  muted: boolean;
  loaded: boolean;
  midiPath?: string;
  name: string;
}

interface MultiTrackPlayerProps {
  midiFiles: string[];
  onTrackUpdate?: (tracks: Track[]) => void;
}

const MultiTrackPlayer: React.FC<MultiTrackPlayerProps> = ({ midiFiles, onTrackUpdate }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(70);
  const [progress, setProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  const masterGainRef = useRef<Tone.Gain | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const isInitializedRef = useRef(false);

  // Initialize audio context and master gain
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        if (!isInitializedRef.current) {
          await Tone.start();
          masterGainRef.current = new Tone.Gain(0.7).toDestination();
          isInitializedRef.current = true;
          console.log('Multi-track audio context initialized');
        }
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    };

    initializeAudio();

    return () => {
      // Cleanup on unmount
      tracks.forEach(track => {
        if (track.synth) track.synth.dispose();
        if (track.part) track.part.dispose();
      });
      if (masterGainRef.current) {
        masterGainRef.current.dispose();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Update tracks when midiFiles change
  useEffect(() => {
    const loadTracks = async () => {
      // Clean up existing tracks
      tracks.forEach(track => {
        if (track.synth) track.synth.dispose();
        if (track.part) track.part.dispose();
      });

      const newTracks: Track[] = [];

      for (let i = 0; i < midiFiles.length; i++) {
        const midiPath = midiFiles[i];
        const track: Track = {
          id: `track-${i}`,
          synth: null,
          part: null,
          notes: [],
          instrument: getInstrumentForTrack(i),
          volume: 0.8,
          muted: false,
          loaded: false,
          midiPath,
          name: `Track ${i + 1}`
        };

        try {
          await loadMIDIForTrack(track);
          newTracks.push(track);
        } catch (error) {
          console.error(`Failed to load track ${i}:`, error);
        }
      }

      setTracks(newTracks);
      onTrackUpdate?.(newTracks);
    };

    if (midiFiles.length > 0) {
      loadTracks();
    } else {
      setTracks([]);
    }
  }, [midiFiles]);

  const getInstrumentForTrack = (index: number): string => {
    const instruments = ['piano', 'guitar', 'bass', 'violin', 'trumpet', 'flute', 'drums', 'organ', 'saxophone', 'synth'];
    return instruments[index % instruments.length];
  };

  const createSynthesizer = (track: Track): Tone.PolySynth | Tone.NoiseSynth => {
    if (!masterGainRef.current) {
      throw new Error('Master gain not initialized');
    }

    let synth: Tone.PolySynth | Tone.NoiseSynth;

    switch (track.instrument) {
      case 'piano':
        synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "fatsawtooth" },
          envelope: { attack: 0.005, decay: 0.3, sustain: 0.2, release: 2.0 }
        }).connect(masterGainRef.current);
        break;
      case 'guitar':
        synth = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 2.5,
          modulationIndex: 15,
          envelope: { attack: 0.002, decay: 0.8, sustain: 0.05, release: 1.2 }
        }).connect(masterGainRef.current);
        break;
      case 'bass':
        synth = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 1,
          modulationIndex: 3,
          envelope: { attack: 0.01, decay: 0.4, sustain: 0.8, release: 1.5 }
        }).connect(masterGainRef.current);
        break;
      case 'violin':
        synth = new Tone.PolySynth(Tone.AMSynth, {
          harmonicity: 3,
          envelope: { attack: 0.2, decay: 0.1, sustain: 0.9, release: 0.8 }
        }).connect(masterGainRef.current);
        break;
      case 'trumpet':
        synth = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 4,
          modulationIndex: 8,
          envelope: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.6 }
        }).connect(masterGainRef.current);
        break;
      case 'flute':
        synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "sine" },
          envelope: { attack: 0.1, decay: 0.2, sustain: 0.6, release: 0.8 }
        }).connect(masterGainRef.current);
        break;
      case 'drums':
        synth = new Tone.NoiseSynth({
          noise: { type: "brown" },
          envelope: { attack: 0.001, decay: 0.15, sustain: 0.0 }
        }).connect(masterGainRef.current);
        break;
      case 'organ':
        synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "square" },
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.95, release: 0.3 }
        }).connect(masterGainRef.current);
        break;
      case 'saxophone':
        synth = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 2.5,
          modulationIndex: 12,
          envelope: { attack: 0.08, decay: 0.3, sustain: 0.6, release: 0.8 }
        }).connect(masterGainRef.current);
        break;
      case 'synth':
        synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "sawtooth" },
          envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 }
        }).connect(masterGainRef.current);
        break;
      default:
        synth = new Tone.PolySynth().connect(masterGainRef.current);
    }

    synth.volume.value = Tone.gainToDb(track.volume);
    return synth;
  };

  const loadMIDIForTrack = async (track: Track): Promise<void> => {
    if (!track.midiPath) return;

    try {
      // Fetch MIDI file
      let response: Response;
      if (track.midiPath.startsWith('blob:') || track.midiPath.startsWith('http')) {
        response = await fetch(track.midiPath);
      } else {
        response = await fetch(`http://localhost:3001/uploads/${track.midiPath}`);
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch MIDI file: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const midi = new Midi(arrayBuffer);

      // Extract notes from all tracks in the MIDI file
      const notes: any[] = [];
      midi.tracks.forEach(midiTrack => {
        midiTrack.notes.forEach(note => {
          notes.push({
            time: note.time,
            note: note.name,
            velocity: note.velocity,
            duration: note.duration
          });
        });
      });

      track.notes = notes;
      track.loaded = true;

      // Create synthesizer and part
      track.synth = createSynthesizer(track);
      
      if (track.instrument === 'drums') {
        // For drums, trigger noise bursts
        track.part = new Tone.Part((time, noteData) => {
          if (track.synth && !track.muted) {
            (track.synth as Tone.NoiseSynth).triggerAttackRelease(noteData.duration, time, noteData.velocity);
          }
        }, notes.map(note => [note.time, note]));
      } else {
        // For melodic instruments
        track.part = new Tone.Part((time, noteData) => {
          if (track.synth && !track.muted) {
            (track.synth as Tone.PolySynth).triggerAttackRelease(noteData.note, noteData.duration, time, noteData.velocity);
          }
        }, notes.map(note => [note.time, note]));
      }

      console.log(`Track ${track.id} loaded: ${notes.length} notes, instrument: ${track.instrument}`);
    } catch (error) {
      console.error(`Error loading MIDI for track ${track.id}:`, error);
      throw error;
    }
  };


  const handleVolumeChange = (trackId: string, volume: number) => {
    setTracks(prevTracks => 
      prevTracks.map(track => {
        if (track.id === trackId) {
          const updatedTrack = { ...track, volume: volume / 100 };
          if (updatedTrack.synth && !updatedTrack.muted) {
            updatedTrack.synth.volume.value = Tone.gainToDb(updatedTrack.volume);
          }
          return updatedTrack;
        }
        return track;
      })
    );
  };

  const handleMute = (trackId: string) => {
    setTracks(prevTracks => 
      prevTracks.map(track => {
        if (track.id === trackId) {
          const updatedTrack = { ...track, muted: !track.muted };
          if (updatedTrack.synth) {
            updatedTrack.synth.volume.value = updatedTrack.muted 
              ? -Infinity 
              : Tone.gainToDb(updatedTrack.volume);
          }
          return updatedTrack;
        }
        return track;
      })
    );
  };

  const handleMasterVolumeChange = (volume: number) => {
    setMasterVolume(volume);
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume / 100;
    }
  };

  const playAll = useCallback(async () => {
    if (isPlaying || tracks.length === 0) return;

    try {
      await Tone.start();
      
      setIsPlaying(true);
      startTimeRef.current = Tone.now();
      
      // Calculate total duration
      let maxDuration = 0;
      tracks.forEach(track => {
        if (track.loaded && track.notes.length > 0) {
          const trackDuration = Math.max(...track.notes.map(n => n.time + (parseFloat(n.duration) || 0.5))) + 1;
          maxDuration = Math.max(maxDuration, trackDuration);
        }
      });

      // Stop and reset transport before starting
      Tone.Transport.stop();
      Tone.Transport.position = 0;

      // Start all loaded tracks
      tracks.forEach(track => {
        if (track.loaded && !track.muted && track.part) {
          // Stop and restart the part to ensure it's in the correct state
          track.part.stop();
          track.part.start(0);
        }
      });

      Tone.Transport.start();
      
      // Start progress tracking
      progressIntervalRef.current = window.setInterval(() => {
        const elapsed = Tone.now() - startTimeRef.current;
        const progressPercent = maxDuration > 0 ? Math.min((elapsed / maxDuration) * 100, 100) : 0;
        setProgress(progressPercent);
        
        if (progressPercent >= 100) {
          stopAll();
        }
      }, 100);
      
    } catch (error) {
      console.error('Error playing tracks:', error);
      setIsPlaying(false);
    }
  }, [tracks, isPlaying]);

  const stopAll = useCallback(() => {
    setIsPlaying(false);
    
    // Stop all tracks
    tracks.forEach(track => {
      if (track.part) {
        track.part.stop();
      }
    });

    // Stop and reset transport
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    
    // Clear progress tracking
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    setProgress(0);
  }, [tracks]);

  const downloadCombinedMIDI = useCallback(() => {
    try {
      // Create a new MIDI file by combining all tracks
      const combinedMidi = new Midi();
      
      tracks.forEach((track, index) => {
        if (track.loaded && track.notes.length > 0) {
          const midiTrack = combinedMidi.addTrack();
          midiTrack.name = track.name;
          
          // Set instrument (for future MIDI instrument mapping)
          // const instrumentMap: { [key: string]: number } = {
          //   'piano': 0, 'guitar': 24, 'bass': 32, 'violin': 40,
          //   'trumpet': 56, 'flute': 73, 'drums': 128, 'organ': 16,
          //   'saxophone': 64, 'synth': 80
          // };
          
          if (track.instrument === 'drums') {
            midiTrack.channel = 9; // Drum channel
          } else {
            midiTrack.channel = index % 15; // Avoid drum channel (9)
            if (midiTrack.channel >= 9) midiTrack.channel += 1;
          }
          
          // Add program change for instrument
          midiTrack.addCC({ number: 0, value: 0, time: 0 }); // Bank select
          midiTrack.addCC({ number: 32, value: 0, time: 0 }); // Bank select LSB
          // Note: Program change will be set through instrument property if available
          
          // Add all notes from this track
          track.notes.forEach(note => {
            if (track.instrument === 'drums') {
              // For drums, use specific drum note mappings
              midiTrack.addNote({
                name: 'C2', // Bass drum
                time: note.time,
                duration: note.duration,
                velocity: note.velocity
              });
            } else {
              midiTrack.addNote({
                name: note.note,
                time: note.time,
                duration: note.duration,
                velocity: note.velocity
              });
            }
          });
        }
      });
      
      // Convert to array buffer and download
      const midiArrayBuffer = combinedMidi.toArray();
      const blob = new Blob([new Uint8Array(midiArrayBuffer)], { type: 'audio/midi' });
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'combined_tracks.mid';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('Combined MIDI downloaded successfully');
    } catch (error) {
      console.error('Error downloading combined MIDI:', error);
    }
  }, [tracks]);

  const downloadCombinedWAV = useCallback(async () => {
    if (tracks.length === 0 || !tracks.some(track => track.loaded)) return;
    
    setIsRecording(true);
    
    try {
      await Tone.start();
      
      // Calculate total duration
      let maxDuration = 0;
      tracks.forEach(track => {
        if (track.loaded && track.notes.length > 0) {
          const trackDuration = Math.max(...track.notes.map(n => n.time + (parseFloat(n.duration) || 0.5))) + 1;
          maxDuration = Math.max(maxDuration, trackDuration);
        }
      });
      
      // Create a recorder
      const recorder = new Tone.Recorder();
      
      // Connect master gain to recorder
      if (masterGainRef.current) {
        masterGainRef.current.connect(recorder);
      }
      
      // Start recording
      recorder.start();
      
      // Stop all current playback and reset transport
      tracks.forEach(track => {
        if (track.part) {
          track.part.stop();
        }
      });
      Tone.Transport.stop();
      Tone.Transport.position = 0;
      
      // Schedule all tracks for recording
      tracks.forEach(track => {
        if (track.loaded && !track.muted && track.part) {
          track.part.start(0);
        }
      });
      
      // Start transport
      Tone.Transport.start();
      
      // Wait for the duration to complete
      await new Promise(resolve => setTimeout(resolve, (maxDuration + 1) * 1000));
      
      // Stop recording
      const recordedBlob = await recorder.stop();
      
      // Stop all tracks and reset transport
      tracks.forEach(track => {
        if (track.part) {
          track.part.stop();
        }
      });
      Tone.Transport.stop();
      Tone.Transport.position = 0;
      
      // Download the recorded audio
      const url = window.URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'combined_tracks.wav';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('Combined WAV downloaded successfully');
    } catch (error) {
      console.error('Error downloading combined WAV:', error);
    } finally {
      setIsRecording(false);
    }
  }, [tracks]);

  const hasLoadedTracks = tracks.some(track => track.loaded);

  return (
    <div className="bg-gray-800/20 backdrop-blur-sm border border-gray-700/30 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-white mb-4">
        ♪ Multi-Track Player
      </h3>

      {/* Master Volume */}
      <div className="mb-6 p-4 bg-gray-900/30 rounded-lg">
        <h4 className="text-md font-medium text-gray-300 mb-3">⚡ Master Volume</h4>
        <div className="flex items-center space-x-3">
          <input
            type="range"
            min="0"
            max="100"
            value={masterVolume}
            onChange={(e) => handleMasterVolumeChange(parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-gray-300 min-w-[40px]">{masterVolume}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tracks */}
      {tracks.length > 0 && (
        <div className="mb-6 space-y-4">
          {tracks.map((track) => (
            <div 
              key={track.id} 
              className={`p-4 rounded-lg border transition-all ${
                track.loaded 
                  ? 'border-green-500/50 bg-green-900/20' 
                  : 'border-gray-600 bg-gray-900/30'
              } ${isPlaying && track.loaded && !track.muted ? 'ring-2 ring-blue-500/50' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-medium flex items-center space-x-2">
                  <span>▶ {track.name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    track.loaded 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {track.loaded ? 'Ready' : 'Loading...'}
                  </span>
                  {isPlaying && track.loaded && !track.muted && (
                    <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 animate-pulse">
                      Playing
                    </span>
                  )}
                  <span className="text-gray-400 text-sm">
                    {track.instrument.charAt(0).toUpperCase() + track.instrument.slice(1)}
                  </span>
                </h4>
                <button
                  onClick={() => handleMute(track.id)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    track.muted
                      ? 'bg-gray-500 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  {track.muted ? '▲ Unmute' : '◾ Mute'}
                </button>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-300 mb-1">Volume</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={track.volume * 100}
                      onChange={(e) => handleVolumeChange(track.id, parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-gray-300 min-w-[40px] text-sm">{Math.round(track.volume * 100)}%</span>
                  </div>
                </div>
              </div>

              {track.loaded && (
                <div className="mt-2 text-xs text-gray-400">
                  {track.notes.length} notes loaded
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col items-center space-y-4">
        {/* Play/Stop Controls */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={playAll}
            disabled={!hasLoadedTracks || isPlaying}
            className={`px-6 py-3 rounded-lg font-semibold text-white transition-all ${
              hasLoadedTracks && !isPlaying
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                : 'bg-gray-500 cursor-not-allowed'
            }`}
          >
            {isPlaying ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin">⟳</div>
                <span>Playing...</span>
              </div>
            ) : (
              '▶ Play All Tracks'
            )}
          </button>

          <button
            onClick={stopAll}
            disabled={!isPlaying}
            className={`px-6 py-3 rounded-lg font-semibold text-white transition-all ${
              isPlaying
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                : 'bg-gray-500 cursor-not-allowed'
            }`}
          >
            ■ Stop All
          </button>
        </div>

        {/* Download Controls */}
        {hasLoadedTracks && (
          <div className="flex justify-center space-x-4">
            <button
              onClick={downloadCombinedMIDI}
              disabled={isPlaying || isRecording}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-all ${
                !isPlaying && !isRecording
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                  : 'bg-gray-500 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7,10 12,15 17,10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Export MIDI</span>
              </div>
            </button>

            <button
              onClick={downloadCombinedWAV}
              disabled={isPlaying || isRecording}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-all ${
                !isPlaying && !isRecording
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                  : 'bg-gray-500 cursor-not-allowed'
              }`}
            >
              {isRecording ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin">⟳</div>
                  <span>Recording...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7,10 12,15 17,10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Export Audio</span>
                </div>
              )}
            </button>
          </div>
        )}
      </div>

      {tracks.length === 0 && (
        <p className="text-center text-gray-400 py-8">
          No tracks loaded. Create some tracks with MIDI files to see them here.
        </p>
      )}
    </div>
  );
};

export default MultiTrackPlayer;
