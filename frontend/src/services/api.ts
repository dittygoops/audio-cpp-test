const API_BASE_URL = 'http://localhost:3001/api';

export interface ConversionResult {
  success: boolean;
  message?: string;
  midiPath?: string;
  error?: string;
  details?: string;
}

export interface CombineResult {
  success: boolean;
  message?: string;
  combinedPath?: string;
  combinedMidiPath?: string;
  combinedWavPath?: string;
  error?: string;
  details?: string;
}

// Limited MIDI instruments based on backend mapping
export const MIDI_INSTRUMENTS = [
  { value: '0', label: 'Piano' },
  { value: '24', label: 'Guitar' },
  { value: '32', label: 'Bass' },
  { value: '128', label: 'Drums' },
  { value: '40', label: 'Violin' },
  { value: '42', label: 'Cello' },
  { value: '56', label: 'Trumpet' },
  { value: '64', label: 'Saxophone' },
  { value: '73', label: 'Flute' },
  { value: '16', label: 'Organ' },
  { value: '80', label: 'Synth' },
];

export const getInstrumentLabel = (value: string): string => {
  const instrument = MIDI_INSTRUMENTS.find(inst => inst.value === value);
  return instrument ? instrument.label : 'Piano';
};

export const transcribeSingle = async (audioBlob: Blob, instrument: string): Promise<Blob> => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');
  formData.append('instrument', instrument);

  try {
    const response = await fetch(`${API_BASE_URL}/transcribe-single`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // The response should be a .mid file blob
    const midiBlob = await response.blob();
    return midiBlob;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
};

export const convertWavToMidi = async (audioBlob: Blob, instrument: string): Promise<ConversionResult> => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');
  formData.append('instrument', instrument);

  try {
    const response = await fetch(`${API_BASE_URL}/transcribe-single`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error converting WAV to MIDI:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

export const combineMidiFiles = async (midiPaths: string[]): Promise<CombineResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/combine-midi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ midiPaths }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error combining MIDI files:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

export const downloadMidiFile = async (filePath: string) => {
  try {
    const filename = filePath.includes('/') ? filePath : filePath; // Handle both full paths and just filenames
    const response = await fetch(`http://localhost:3001/uploads/${filename}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};
