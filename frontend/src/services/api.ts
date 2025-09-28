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
  error?: string;
  details?: string;
}

// Common MIDI instruments
export const MIDI_INSTRUMENTS = [
  { value: '0', label: 'Acoustic Grand Piano' },
  { value: '1', label: 'Bright Acoustic Piano' },
  { value: '2', label: 'Electric Grand Piano' },
  { value: '3', label: 'Honky-tonk Piano' },
  { value: '4', label: 'Electric Piano 1' },
  { value: '5', label: 'Electric Piano 2' },
  { value: '6', label: 'Harpsichord' },
  { value: '7', label: 'Clavinet' },
  { value: '8', label: 'Celesta' },
  { value: '9', label: 'Glockenspiel' },
  { value: '10', label: 'Music Box' },
  { value: '11', label: 'Vibraphone' },
  { value: '12', label: 'Marimba' },
  { value: '13', label: 'Xylophone' },
  { value: '14', label: 'Tubular Bells' },
  { value: '15', label: 'Dulcimer' },
  { value: '16', label: 'Drawbar Organ' },
  { value: '17', label: 'Percussive Organ' },
  { value: '18', label: 'Rock Organ' },
  { value: '19', label: 'Church Organ' },
  { value: '20', label: 'Reed Organ' },
  { value: '21', label: 'Accordion' },
  { value: '22', label: 'Harmonica' },
  { value: '23', label: 'Tango Accordion' },
  { value: '24', label: 'Acoustic Guitar (nylon)' },
  { value: '25', label: 'Acoustic Guitar (steel)' },
  { value: '26', label: 'Electric Guitar (jazz)' },
  { value: '27', label: 'Electric Guitar (clean)' },
  { value: '28', label: 'Electric Guitar (muted)' },
  { value: '29', label: 'Overdriven Guitar' },
  { value: '30', label: 'Distortion Guitar' },
  { value: '31', label: 'Guitar Harmonics' },
  { value: '32', label: 'Acoustic Bass' },
  { value: '33', label: 'Electric Bass (finger)' },
  { value: '34', label: 'Electric Bass (pick)' },
  { value: '35', label: 'Fretless Bass' },
  { value: '36', label: 'Slap Bass 1' },
  { value: '37', label: 'Slap Bass 2' },
  { value: '38', label: 'Synth Bass 1' },
  { value: '39', label: 'Synth Bass 2' },
  { value: '40', label: 'Violin' },
  { value: '41', label: 'Viola' },
  { value: '42', label: 'Cello' },
  { value: '43', label: 'Contrabass' },
  { value: '44', label: 'Tremolo Strings' },
  { value: '45', label: 'Pizzicato Strings' },
  { value: '46', label: 'Orchestral Harp' },
  { value: '47', label: 'Timpani' },
  { value: '48', label: 'String Ensemble 1' },
  { value: '49', label: 'String Ensemble 2' },
  { value: '50', label: 'Synth Strings 1' },
  { value: '51', label: 'Synth Strings 2' },
  { value: '52', label: 'Choir Aahs' },
  { value: '53', label: 'Voice Oohs' },
  { value: '54', label: 'Synth Voice' },
  { value: '55', label: 'Orchestra Hit' },
  { value: '56', label: 'Trumpet' },
  { value: '57', label: 'Trombone' },
  { value: '58', label: 'Tuba' },
  { value: '59', label: 'Muted Trumpet' },
  { value: '60', label: 'French Horn' },
  { value: '61', label: 'Brass Section' },
  { value: '62', label: 'Synth Brass 1' },
  { value: '63', label: 'Synth Brass 2' },
  { value: '64', label: 'Soprano Sax' },
  { value: '65', label: 'Alto Sax' },
  { value: '66', label: 'Tenor Sax' },
  { value: '67', label: 'Baritone Sax' },
  { value: '68', label: 'Oboe' },
  { value: '69', label: 'English Horn' },
  { value: '70', label: 'Bassoon' },
  { value: '71', label: 'Clarinet' },
  { value: '72', label: 'Piccolo' },
  { value: '73', label: 'Flute' },
  { value: '74', label: 'Recorder' },
  { value: '75', label: 'Pan Flute' },
  { value: '76', label: 'Blown Bottle' },
  { value: '77', label: 'Shakuhachi' },
  { value: '78', label: 'Whistle' },
  { value: '79', label: 'Ocarina' },
  { value: '80', label: 'Lead 1 (square)' },
  { value: '81', label: 'Lead 2 (sawtooth)' },
  { value: '82', label: 'Lead 3 (calliope)' },
  { value: '83', label: 'Lead 4 (chiff)' },
  { value: '84', label: 'Lead 5 (charang)' },
  { value: '85', label: 'Lead 6 (voice)' },
  { value: '86', label: 'Lead 7 (fifths)' },
  { value: '87', label: 'Lead 8 (bass + lead)' },
  { value: '88', label: 'Pad 1 (new age)' },
  { value: '89', label: 'Pad 2 (warm)' },
  { value: '90', label: 'Pad 3 (polysynth)' },
  { value: '91', label: 'Pad 4 (choir)' },
  { value: '92', label: 'Pad 5 (bowed)' },
  { value: '93', label: 'Pad 6 (metallic)' },
  { value: '94', label: 'Pad 7 (halo)' },
  { value: '95', label: 'Pad 8 (sweep)' },
  { value: '96', label: 'FX 1 (rain)' },
  { value: '97', label: 'FX 2 (soundtrack)' },
  { value: '98', label: 'FX 3 (crystal)' },
  { value: '99', label: 'FX 4 (atmosphere)' },
  { value: '100', label: 'FX 5 (brightness)' },
  { value: '101', label: 'FX 6 (goblins)' },
  { value: '102', label: 'FX 7 (echoes)' },
  { value: '103', label: 'FX 8 (sci-fi)' },
  { value: '104', label: 'Sitar' },
  { value: '105', label: 'Banjo' },
  { value: '106', label: 'Shamisen' },
  { value: '107', label: 'Koto' },
  { value: '108', label: 'Kalimba' },
  { value: '109', label: 'Bagpipe' },
  { value: '110', label: 'Fiddle' },
  { value: '111', label: 'Shanai' },
  { value: '112', label: 'Tinkle Bell' },
  { value: '113', label: 'Agogo' },
  { value: '114', label: 'Steel Drums' },
  { value: '115', label: 'Woodblock' },
  { value: '116', label: 'Taiko Drum' },
  { value: '117', label: 'Melodic Tom' },
  { value: '118', label: 'Synth Drum' },
  { value: '119', label: 'Reverse Cymbal' },
  { value: '120', label: 'Guitar Fret Noise' },
  { value: '121', label: 'Breath Noise' },
  { value: '122', label: 'Seashore' },
  { value: '123', label: 'Bird Tweet' },
  { value: '124', label: 'Telephone Ring' },
  { value: '125', label: 'Helicopter' },
  { value: '126', label: 'Applause' },
  { value: '127', label: 'Gunshot' },
];

export const convertWavToMidi = async (audioBlob: Blob, instrument: string): Promise<ConversionResult> => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');
  formData.append('instrument', instrument);

  try {
    const response = await fetch(`${API_BASE_URL}/convert-to-midi`, {
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

export const downloadMidiFile = async (midiPath: string) => {
  try {
    const response = await fetch(`http://localhost:3001/uploads/${midiPath}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = midiPath.split('/').pop() || 'combined_midi.mid';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading MIDI file:', error);
    throw error;
  }
};
