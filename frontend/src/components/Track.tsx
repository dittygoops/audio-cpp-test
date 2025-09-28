import { useState } from 'react';
import AudioRecorder from './AudioRecorder';
import MidiPlayer from './MidiPlayer';
import InstrumentSearch from './InstrumentSearch';
import { transcribeSingle, getInstrumentLabel } from '../services/api';

interface TrackProps {
  trackId: string;
  trackNumber: number;
  onRemove?: () => void;
  onMidiGenerated?: (midiPath: string) => void;
}

export interface TrackData {
  id: string;
  instrument: string;
  audioBlob?: Blob;
  midiPath?: string;
  isConverting: boolean;
  conversionError?: string;
}

const Track: React.FC<TrackProps> = ({
  trackId,
  trackNumber,
  onRemove,
  onMidiGenerated,
}) => {
  const [trackData, setTrackData] = useState<TrackData>({
    id: trackId,
    instrument: '0', // Default to Acoustic Grand Piano
    isConverting: false,
    conversionError: undefined,
  });

  const handleInstrumentChange = (value: string) => {
    setTrackData(prev => ({
      ...prev,
      instrument: value,
    }));
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setTrackData(prev => ({
      ...prev,
      audioBlob,
      isConverting: true,
      conversionError: undefined,
    }));

    try {
      // Get the instrument label from the selected instrument value
      const instrumentLabel = getInstrumentLabel(trackData.instrument);
      
      // Transcribe the recorded audio to MIDI with the selected instrument
      const midiBlob = await transcribeSingle(audioBlob, instrumentLabel);
      
      // Create a URL for the MIDI blob so it can be used by MidiPlayer
      const midiUrl = URL.createObjectURL(midiBlob);
      
      setTrackData(prev => ({
        ...prev,
        midiPath: midiUrl,
        isConverting: false,
      }));
      onMidiGenerated?.(midiUrl);
    } catch (error) {
      setTrackData(prev => ({
        ...prev,
        isConverting: false,
        conversionError: 'Failed to transcribe recording',
      }));
    }
  };

  const handleReRecord = () => {
    setTrackData(prev => ({
      ...prev,
      audioBlob: undefined,
      midiPath: undefined,
      conversionError: undefined,
    }));
  };


  return (
    <div className="bg-gray-800/20 backdrop-blur-sm border border-gray-700/30 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Track {trackNumber}
        </h3>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-red-400 hover:text-red-300 p-1"
            title="Remove Track"
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        )}
      </div>

      {/* Instrument Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Instrument
        </label>
        <InstrumentSearch
          value={trackData.instrument}
          onChange={handleInstrumentChange}
        />
      </div>

      {/* Recording Section */}
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-300 mb-2">Recording</h4>
        {trackData.audioBlob ? (
          <div className="flex flex-col items-center p-3 bg-green-900/50 border border-green-700 rounded-lg">
            <div className="text-green-400 mb-2">
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22,4 12,14.01 9,11.01"></polyline>
              </svg>
            </div>
            <p className="text-green-300 text-sm text-center mb-2">
              Recording completed successfully
            </p>
            <button
              onClick={handleReRecord}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Re-record
            </button>
          </div>
        ) : (
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            disabled={trackData.isConverting}
          />
        )}
      </div>

      {/* Conversion Status */}
      {trackData.isConverting && (
        <div className="mb-4 p-3 bg-blue-900/50 border border-blue-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin text-blue-400">⟳</div>
            <span className="text-blue-300">Converting to MIDI...</span>
          </div>
        </div>
      )}

      {/* Conversion Error */}
      {trackData.conversionError && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
          <div className="text-red-400 mb-1">❌</div>
          <p className="text-red-300 text-sm mb-2">{trackData.conversionError}</p>
          <button
            onClick={handleReRecord}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* MIDI Player */}
      <div>
        <h4 className="text-md font-medium text-gray-300 mb-2">MIDI Preview</h4>
        <MidiPlayer
          midiPath={trackData.midiPath}
          instrument={trackData.instrument}
          disabled={trackData.isConverting || !trackData.midiPath}
        />
      </div>
    </div>
  );
};

export default Track;
