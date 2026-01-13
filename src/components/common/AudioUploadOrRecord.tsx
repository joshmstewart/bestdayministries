import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, Upload, X, Play, Pause, Square } from "lucide-react";

interface AudioUploadOrRecordProps {
  label?: string;
  audioUrl?: string | null;
  onAudioChange: (blob: Blob | null, url: string | null) => void;
  showRecorder?: boolean;
  className?: string;
}

export function AudioUploadOrRecord({
  label = "Audio",
  audioUrl,
  onAudioChange,
  showRecorder = true,
  className = "",
}: AudioUploadOrRecordProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        onAudioChange(audioBlob, url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      return;
    }

    const url = URL.createObjectURL(file);
    onAudioChange(file, url);
  };

  const togglePlayback = () => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const removeAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    onAudioChange(null, null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Label>{label}</Label>

      {audioUrl ? (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={togglePlayback}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <div className="flex-1">
            <div className="h-1 bg-primary/20 rounded-full">
              <div className="h-1 bg-primary rounded-full w-0" />
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={removeAudio}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : isRecording ? (
        <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
          <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
          <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
          <div className="flex-1" />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopRecording}
          >
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          {showRecorder && (
            <Button
              type="button"
              variant="outline"
              onClick={startRecording}
              className="flex-1"
            >
              <Mic className="w-5 h-5 text-red-500 mr-2" strokeWidth={2.5} />
              Record Audio
            </Button>
          )}
          <label className="flex-1">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              asChild
            >
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </span>
            </Button>
            <Input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        </div>
      )}
    </div>
  );
}
