import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Volume2 } from 'lucide-react';

interface AudioRecorderProps {
  onAudioRecorded: (base64Audio: string) => void;
  onAudioDeleted: () => void;
}

export default function AudioRecorder({ onAudioRecorded, onAudioDeleted }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveforms, setWaveforms] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Generate randomized waveforms for the audio track representation
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setWaveforms(prev => {
          const next = [...prev, Math.floor(Math.random() * 25) + 5];
          // Keep only last 35 bars to fit the view
          if (next.length > 35) next.shift();
          return next;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          onAudioRecorded(base64data);
        };

        // Stop all tracks on the stream to release mic icon
        stream.getTracks().forEach(track => track.stop());
      };

      setRecordingTime(0);
      setWaveforms([]);
      mediaRecorder.start();
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("میکروفون در دسترس نیست:", err);
      alert("خطا در دسترسی به میکروفون. لطفا دسترسی به میکروفون را تایید کنید.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const deleteRecording = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlaying(false);
    setAudioUrl(null);
    setRecordingTime(0);
    setWaveforms([]);
    onAudioDeleted();
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current) return;

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex flex-col p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 relative" id="voice-recorder-container">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 font-sans flex items-center gap-1">
          <Volume2 className="w-4 h-4 text-red-500" />
          ضبط گزارش صوتی
        </span>
        {audioUrl && (
          <button
            type="button"
            onClick={deleteRecording}
            className="text-red-500 hover:text-red-700 transition p-1 hover:bg-red-50 rounded"
            title="حذف ویس"
            id="btn-delete-audio"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 justify-between" id="recording-control-area">
        {!audioUrl ? (
          <div className="flex items-center gap-3 w-full">
            {isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-md shadow-red-200 transition-all animate-pulse"
                id="btn-stop-rec"
              >
                <Square className="w-5 h-5 fill-white" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-100 transition-all"
                id="btn-start-rec"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}

            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm font-mono text-gray-700 bg-gray-200/60 px-2 py-1 rounded" id="timer-display">
                {formatTime(recordingTime)}
              </span>
              {isRecording ? (
                <div className="flex-1 flex items-end gap-[2px] h-8 px-2 overflow-hidden" id="recording-waves">
                  {waveforms.map((h, i) => (
                    <div
                      key={i}
                      className="bg-red-500 rounded-t w-[3px]"
                      style={{ height: `${h * 1.5}px` }}
                    />
                  ))}
                  <span className="text-xs text-red-500 mr-2 animate-pulse self-center">در حال ضبط...</span>
                </div>
              ) : (
                <span className="text-xs text-gray-400">برای ضبط صدا روی دکمه میکروفون کلیک کنید.</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={togglePlayback}
              className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-900 flex items-center justify-center text-white transition-all shadow"
              id="btn-play-audio"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white translate-x-[1px]" />}
            </button>

            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 flex items-center gap-[2px] h-6 bg-gray-200/50 rounded px-2" id="playback-waves">
                {/* Visualizer for finished track */}
                {Array.from({ length: 28 }).map((_, i) => {
                  const h = Math.sin(i * 0.4) * 8 + 12;
                  return (
                    <div
                      key={i}
                      className={`rounded-full w-[3px] transition-colors duration-150 ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}
                      style={{ height: `${h}px` }}
                    />
                  );
                })}
              </div>
              <span className="text-xs font-mono text-gray-600 bg-gray-200 px-2 py-0.5 rounded">
                ویس آماده ارسال
              </span>
            </div>

            <audio
              ref={audioPlayerRef}
              src={audioUrl}
              onEnded={handleAudioEnded}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  );
}
