import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { formatBytes } from "@/lib/videoCompression";

export type UploadStage = 'loading' | 'compressing' | 'uploading' | 'done' | 'error';

export interface UploadProgress {
  stage: UploadStage;
  progress: number; // 0-100
  message: string;
  originalSize?: number;
  compressedSize?: number;
  uploadedBytes?: number;
  totalBytes?: number;
  error?: string;
}

interface VideoUploadProgressProps {
  progress: UploadProgress;
  onCancel?: () => void;
  onRetry?: () => void;
}

export function VideoUploadProgress({ progress, onCancel, onRetry }: VideoUploadProgressProps) {
  const { stage, progress: progressValue, message, originalSize, compressedSize, uploadedBytes, totalBytes, error } = progress;

  const getStageIcon = () => {
    switch (stage) {
      case 'done':
        return <CheckCircle2 className="w-5 h-5 text-primary" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
    }
  };

  const getStageTitle = () => {
    switch (stage) {
      case 'loading':
        return 'Preparing video processor...';
      case 'compressing':
        return 'Optimizing video for web...';
      case 'uploading':
        return 'Uploading video...';
      case 'done':
        return 'Upload complete!';
      case 'error':
        return 'Upload failed';
      default:
        return 'Processing...';
    }
  };

  const showSizeInfo = (stage === 'compressing' || stage === 'uploading' || stage === 'done') && originalSize;
  const showUploadBytes = stage === 'uploading' && uploadedBytes !== undefined && totalBytes;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {getStageIcon()}
          <div>
            <p className="font-medium text-sm">{getStageTitle()}</p>
            <p className="text-xs text-muted-foreground">{message}</p>
          </div>
        </div>
        
        {(stage !== 'done' && stage !== 'error') && onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="shrink-0"
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        )}
        
        {stage === 'error' && onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="shrink-0"
          >
            Retry
          </Button>
        )}
      </div>

      {stage !== 'done' && stage !== 'error' && (
        <div className="space-y-2">
          <Progress value={progressValue} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(progressValue)}%</span>
            {showUploadBytes && (
              <span>{formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}</span>
            )}
          </div>
        </div>
      )}

      {showSizeInfo && (
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Original: </span>
            <span className="font-medium">{formatBytes(originalSize)}</span>
          </div>
          {compressedSize && compressedSize !== originalSize && (
            <div>
              <span className="text-muted-foreground">Optimized: </span>
              <span className="font-medium text-primary">{formatBytes(compressedSize)}</span>
              <span className="text-primary ml-1">
                ({Math.round((1 - compressedSize / originalSize) * 100)}% smaller)
              </span>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
