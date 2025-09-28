import { useState } from 'react';
import AudioRecorder from './AudioRecorder';
import MidiPlayer from './MIDIPlayer';
import { convertWavToMidi, MIDI_INSTRUMENTS } from '../services/api';

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

  const handleInstrumentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTrackData(prev => ({
      ...prev,
      instrument: e.target.value,
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
      // Convert the recorded audio to MIDI
      const result = await convertWavToMidi(audioBlob, trackData.instrument);

      if (result.success && result.midiPath) {
        setTrackData(prev => ({
          ...prev,
          midiPath: result.midiPath,
          isConverting: false,
        }));
        onMidiGenerated?.(result.midiPath);
      } else {
        setTrackData(prev => ({
          ...prev,
          isConverting: false,
          conversionError: result.error || 'Conversion failed',
        }));
      }
    } catch (error) {
      setTrackData(prev => ({
        ...prev,
        isConverting: false,
        conversionError: 'Failed to convert recording',
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

  const selectedInstrument = MIDI_INSTRUMENTS.find(inst => inst.value === trackData.instrument);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Track {trackNumber}
        </h3>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 p-1"
            title="Remove Track"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Instrument Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Instrument
        </label>
        <select
          value={trackData.instrument}
          onChange={handleInstrumentChange}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {MIDI_INSTRUMENTS.map(instrument => (
            <option key={instrument.value} value={instrument.value}>
              {instrument.label}
            </option>
          ))}
        </select>
        {selectedInstrument && (
          <div className="mt-1 text-sm text-gray-600">
            Selected: {selectedInstrument.label}
          </div>
        )}
      </div>

      {/* Recording Section */}
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-700 mb-2">Recording</h4>
        {trackData.audioBlob ? (
          <div className="flex flex-col items-center p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-green-600 mb-2">✅</div>
            <p className="text-green-700 text-sm text-center mb-2">
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
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin text-blue-600">⟳</div>
            <span className="text-blue-700">Converting to MIDI...</span>
          </div>
        </div>
      )}

      {/* Conversion Error */}
      {trackData.conversionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 mb-1">❌</div>
          <p className="text-red-700 text-sm mb-2">{trackData.conversionError}</p>
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
        <h4 className="text-md font-medium text-gray-700 mb-2">MIDI Preview</h4>
        <MidiPlayer
          midiPath={trackData.midiPath}
          disabled={trackData.isConverting || !trackData.midiPath}
        />
      </div>
    </div>
  );
};

export default Track;
