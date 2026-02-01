import { useState, useCallback, useRef, useEffect } from "react";

interface UseSpeechToTextOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  continuous?: boolean;
  interimResults?: boolean;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

export const useSpeechToText = (options: UseSpeechToTextOptions = {}) => {
  const { onResult, onError, continuous = true, interimResults = true } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isStartingRef = useRef(false);
  const hasReceivedResultRef = useRef(false);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        console.log('[STT] Recognition started');
        isStartingRef.current = false;
        hasReceivedResultRef.current = false;
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        hasReceivedResultRef.current = true;
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);
        
        if (finalTranscript && onResult) {
          onResult(finalTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("[STT] Error:", event.error);
        isStartingRef.current = false;
        setIsListening(false);
        
        // Don't report 'aborted' as an error - it's expected when stopping
        if (event.error !== 'aborted' && onError) {
          onError(event.error);
        }
      };

      recognition.onend = () => {
        console.log('[STT] Recognition ended');
        isStartingRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [continuous, interimResults, onResult, onError]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current || isListening || isStartingRef.current) return;
    
    isStartingRef.current = true;
    setTranscript("");
    
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Small delay to ensure clean state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      recognitionRef.current.start();
    } catch (error: any) {
      console.error("[STT] Failed to start:", error);
      isStartingRef.current = false;
      setIsListening(false);
      
      if (error.name === 'NotAllowedError') {
        onError?.("not-allowed");
      } else {
        onError?.(error.message || "Failed to start");
      }
    }
  }, [isListening, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
      setIsListening(false);
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  };
};
