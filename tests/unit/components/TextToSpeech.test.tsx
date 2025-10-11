import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextToSpeech } from '@/components/TextToSpeech';

// Mock the speech synthesis API
const mockSpeak = vi.fn();
const mockCancel = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  
  global.speechSynthesis = {
    speak: mockSpeak,
    cancel: mockCancel,
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
    speaking: false,
    pending: false,
    paused: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as any;
});

describe('TextToSpeech', () => {
  it('renders the play button', () => {
    render(<TextToSpeech text="Test content" />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('calls speechSynthesis.speak when clicked', () => {
    render(<TextToSpeech text="Hello world" />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    expect(mockSpeak).toHaveBeenCalled();
  });

  it('does not render when text is empty', () => {
    const { container } = render(<TextToSpeech text="" />);
    expect(container.firstChild).toBeNull();
  });

  it('cancels speech when unmounted', () => {
    const { unmount } = render(<TextToSpeech text="Test" />);
    
    unmount();
    
    expect(mockCancel).toHaveBeenCalled();
  });
});
