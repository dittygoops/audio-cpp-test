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

// Common MIDI instruments
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

export const getInstrumentLabel = (instrumentValue: string): string => {
  const instrument = MIDI_INSTRUMENTS.find(inst => inst.value === instrumentValue);
  return instrument ? instrument.label : 'Unknown Instrument';
};

export const transcribeSingle = async (audioBlob: Blob, instrument: string): Promise<Blob> => {
  const result = await convertWavToMidi(audioBlob, instrument);
  
  if (!result.success || !result.midiPath) {
    throw new Error(result.error || 'Failed to transcribe audio to MIDI');
  }
  
  // Fetch the MIDI file from the server
  const response = await fetch(`http://localhost:3001/uploads/${result.midiPath}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch MIDI file: ${response.statusText}`);
  }
  
  return await response.blob();
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
      // If it's an error response, try to get JSON error details
      try {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || `HTTP error! status: ${response.status}`,
          details: errorData.details
        };
      } catch {
        // If error response isn't JSON, return generic error
        return {
          success: false,
          error: `HTTP error! status: ${response.status}`,
        };
      }
    }

    // Success - the response is now JSON with the MIDI file path
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

export const combineMidiFiles = async (midiFilePaths: string[]): Promise<CombineResult> => {
  try {
    const formData = new FormData();
    
    // Convert each MIDI file path to a File object and add to form data
    for (let index = 0; index < midiFilePaths.length; index++) {
      const midiPath = midiFilePaths[index];
      
      try {
        // Fetch the MIDI file from the URL
        let response: Response;
        if (midiPath.startsWith('blob:') || midiPath.startsWith('http')) {
          response = await fetch(midiPath);
        } else {
          response = await fetch(`http://localhost:3001/uploads/${midiPath}`);
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch MIDI file: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        // Create a File object from the blob
        const file = new File([blob], `track${index}.mid`, { type: 'audio/midi' });
        formData.append(`file${index}`, file);
        
        console.log(`Added MIDI file ${index}: ${file.name} (${file.size} bytes)`);
      } catch (error) {
        console.error(`Error fetching MIDI file ${index} (${midiPath}):`, error);
        throw new Error(`Failed to load MIDI file ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Sending ${midiFilePaths.length} MIDI files to backend for combination`);

    const response = await fetch(`${API_BASE_URL}/combine-midi`, {
      method: 'POST',
      body: formData, // Don't set Content-Type header, let browser set it with boundary
    });

    if (!response.ok) {
      // If it's an error response, try to get JSON error details
      try {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || `HTTP error! status: ${response.status}`,
          details: errorData.details
        };
      } catch {
        // If error response isn't JSON, return generic error
        return {
          success: false,
          error: `HTTP error! status: ${response.status}`,
        };
      }
    }

    // Success - the response is a MIDI file download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'combined.mid';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return {
      success: true,
      message: 'MIDI files combined successfully'
    };
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
