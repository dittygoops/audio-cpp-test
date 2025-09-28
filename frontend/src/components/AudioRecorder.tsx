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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  if (!isPermissionGranted) {
    return (
      <div className="flex flex-col items-center p-4 border border-red-700 rounded-lg bg-red-900/50">
        <div className="text-red-400 mb-2">🎤</div>
        <p className="text-red-300 text-sm text-center">
          Microphone permission required
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Grant Permission
        </button>
      </div>
    );
  }

  return (
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
  );
};

export default AudioRecorder;
