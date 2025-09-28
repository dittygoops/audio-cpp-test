import { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  recordingDuration?: number; // in seconds
  disabled?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  recordingDuration = 15,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(recordingDuration);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Request microphone permission on component mount
  useEffect(() => {
    const requestPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsPermissionGranted(true);
        // Stop the stream immediately since we're just requesting permission
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Error requesting microphone permission:', error);
        setIsPermissionGranted(false);
      }
    };

    requestPermission();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    if (!isPermissionGranted || disabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        // Convert to WAV format for the backend
        convertToWav(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTimeLeft(recordingDuration);

      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      setIsRecording(false);

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }
  };

  const convertToWav = async (audioBlob: Blob) => {
    try {
      // For now, we'll send the webm blob and let the backend handle conversion
      // In a production app, you might want to convert to WAV on the client side
      onRecordingComplete(audioBlob);
    } catch (error) {
      console.error('Error converting audio:', error);
      alert('Failed to process recording. Please try again.');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('audio/wav') && !file.name.toLowerCase().endsWith('.wav')) {
      alert('Please upload a .wav file');
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert('File size must be less than 50MB');
      return;
    }

    // Convert file to blob and pass to parent
    const blob = new Blob([file], { type: file.type });
    onRecordingComplete(blob);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const renderPermissionPrompt = () => (
    <div className="flex flex-col items-center p-4 border border-red-700 rounded-lg bg-red-900/50">
      <div className="text-red-400 mb-2">🎤</div>
      <p className="text-red-300 text-sm text-center">
        Microphone permission required for recording
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
      >
        Grant Permission
      </button>
    </div>
  );

  return (
    <div className="flex flex-col space-y-4">
      {/* Tab Navigation */}
      <div className="flex rounded-lg bg-gray-700/50 p-1">
        <button
          onClick={() => setActiveTab('record')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'record'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
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
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
            <span>Record Audio</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'upload'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
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
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
            <span>Upload File</span>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'record' ? (
        // Recording Tab
        !isPermissionGranted ? (
          renderPermissionPrompt()
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center">
              <div className={`mb-2 ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                {isRecording ? (
                  <svg 
                    width="48" 
                    height="48" 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                    className="mx-auto"
                  >
                    <circle cx="12" cy="12" r="8"></circle>
                  </svg>
                ) : (
                  <svg 
                    width="48" 
                    height="48" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="mx-auto"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                )}
              </div>
              <div className="text-lg font-semibold text-white">
                {isRecording ? 'Recording...' : 'Ready to Record'}
              </div>
              <div className="text-sm text-gray-300">
                {formatTime(timeLeft)}
              </div>
            </div>

            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={disabled}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>

            <div className="text-xs text-gray-400 text-center max-w-xs">
              Click "Start Recording" to begin a {recordingDuration}-second audio recording.
              The recording will automatically stop after {recordingDuration} seconds.
            </div>
          </div>
        )
      ) : (
        // Upload Tab
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <div className="mb-2 text-gray-400">
              <svg 
                width="48" 
                height="48" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="mx-auto"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17,8 12,3 7,8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <div className="text-lg font-semibold text-white">
              Upload WAV File
            </div>
            <div className="text-sm text-gray-300">
              Select a .wav file from your computer
            </div>
          </div>

          <button
            onClick={handleUploadClick}
            disabled={disabled}
            className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors bg-blue-600 hover:bg-blue-700 ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Choose WAV File
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,audio/wav"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="text-xs text-gray-400 text-center max-w-xs">
            Upload a .wav audio file (max 50MB). The file will be processed and converted to MIDI.
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
