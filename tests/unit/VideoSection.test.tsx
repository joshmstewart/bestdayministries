import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import VideoSection from '@/components/VideoSection';

describe('VideoSection', () => {
  it('should not render when no video URL is provided', () => {
    const { container } = render(<VideoSection content={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render with YouTube video', () => {
    const content = {
      title: 'Test Video',
      description: 'Test description',
      video_type: 'youtube' as const,
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    };

    render(<VideoSection content={content} />);
    const headings = screen.getAllByRole('heading', { name: 'Test Video' });
    expect(headings.length).toBeGreaterThan(0);
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should render with uploaded video', () => {
    const content = {
      title: 'Test Video',
      video_type: 'upload' as const,
      video_url: 'https://example.com/video.mp4',
    };

    render(<VideoSection content={content} />);
    const headings = screen.getAllByRole('heading', { name: 'Test Video' });
    expect(headings.length).toBeGreaterThan(0);
  });

  it('should use default title when not provided', () => {
    const content = {
      video_type: 'youtube' as const,
      youtube_url: 'https://www.youtube.com/watch?v=test',
    };

    render(<VideoSection content={content} />);
    expect(screen.getByRole('heading', { name: 'Featured Video' })).toBeInTheDocument();
  });
});
