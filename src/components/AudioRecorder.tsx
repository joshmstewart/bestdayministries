import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onRecordingCancel?: () => void;
}

export default function AudioRecorder({ onRecordingComplete, onRecordingCancel }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Recording stopped");
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl("");
    chunksRef.current = [];
    if (onRecordingCancel) {
      onRecordingCancel();
    }
  };

  const submitRecording = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
      deleteRecording();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        {!isRecording && !audioBlob && (
          <Button
            type="button"
            onClick={startRecording}
            className="gap-2"
            variant="outline"
          >
            <Mic className="w-4 h-4" />
            Record Audio
          </Button>
        )}

        {isRecording && (
          <Button
            type="button"
            onClick={stopRecording}
            className="gap-2 bg-destructive hover:bg-destructive/90"
          >
            <Square className="w-4 h-4" />
            Stop Recording
          </Button>
        )}

        {audioBlob && !isRecording && (
          <>
            <Button
              type="button"
              onClick={submitRecording}
              className="gap-2"
            >
              Use This Recording
            </Button>
            <Button
              type="button"
              onClick={deleteRecording}
              variant="outline"
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </>
        )}
      </div>

      {audioUrl && !isRecording && (
        <div className="mt-4">
          <audio controls className="w-full">
            <source src={audioUrl} type="audio/webm" />
            Your browser does not support audio playback.
          </audio>
        </div>
      )}

      {isRecording && (
        <div className="flex items-center gap-2 text-destructive animate-pulse">
          <div className="w-3 h-3 bg-destructive rounded-full" />
          <span className="text-sm font-medium">Recording...</span>
        </div>
      )}
    </div>
  );
}
