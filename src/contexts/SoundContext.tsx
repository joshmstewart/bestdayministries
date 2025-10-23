import React, { createContext, useContext, ReactNode } from 'react';
import { useSoundEffects, SoundEventType } from '@/hooks/useSoundEffects';

interface SoundContextType {
  playSound: (eventType: SoundEventType) => void;
  loading: boolean;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: ReactNode }) {
  const { playSound, loading } = useSoundEffects();

  return (
    <SoundContext.Provider value={{ playSound, loading }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (context === undefined) {
    // Return no-op functions if used outside provider
    return {
      playSound: () => {},
      loading: false,
    };
  }
  return context;
}
