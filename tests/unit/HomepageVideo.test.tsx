import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomepageVideo from '@/components/HomepageVideo';

describe('HomepageVideo', () => {
  it('should not render when no video URL is provided', () => {
    const { container } = render(<HomepageVideo content={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render with YouTube video', () => {
    const content = {
      title: 'Test Video',
      description: 'Test description',
      video_type: 'youtube' as const,
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    };

    render(<HomepageVideo content={content} />);
    expect(screen.getByText('Test Video')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should render with uploaded video', () => {
    const content = {
      title: 'Test Video',
      video_type: 'uploaded' as const,
      video_url: 'https://example.com/video.mp4',
    };

    render(<HomepageVideo content={content} />);
    expect(screen.getByText('Test Video')).toBeInTheDocument();
  });

  it('should use default title when not provided', () => {
    const content = {
      video_type: 'youtube' as const,
      youtube_url: 'https://www.youtube.com/watch?v=test',
    };

    render(<HomepageVideo content={content} />);
    expect(screen.getByText('Featured Video')).toBeInTheDocument();
  });
});
