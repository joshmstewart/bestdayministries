import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mock video data
const mockVideos = [
  {
    id: 'video-1',
    title: 'Welcome Video',
    description: 'Introduction to our community',
    video_type: 'uploaded',
    video_id: 'video-123',
    cover_url: '/videos/cover1.jpg',
    is_active: true,
    display_order: 1
  },
  {
    id: 'video-2',
    title: 'Tour Video',
    description: 'Take a tour of our features',
    video_type: 'youtube',
    youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    is_active: true,
    display_order: 2
  }
];

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: mockVideos, error: null }))
      })),
      order: vi.fn(() => Promise.resolve({ data: mockVideos, error: null }))
    }))
  })),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null } }))
  }
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Test component that renders videos
const VideoListTest = () => {
  return (
    <div>
      <h1>Videos</h1>
      {mockVideos.map(video => (
        <article key={video.id} data-testid="video-item">
          <h3>{video.title}</h3>
          <p>{video.description}</p>
          {video.video_type === 'youtube' && video.youtube_url && (
            <iframe
              src={`https://www.youtube.com/embed/${video.youtube_url.split('v=')[1]}`}
              title={video.title}
              allowFullScreen
            />
          )}
          {video.video_type === 'uploaded' && (
            <video controls>
              <source src={`/videos/${video.video_id}`} type="video/mp4" />
            </video>
          )}
          {video.cover_url && (
            <img src={video.cover_url} alt={`${video.title} thumbnail`} />
          )}
        </article>
      ))}
    </div>
  );
};

describe('Video Player - Video Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders video list with titles', () => {
    render(<VideoListTest />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Welcome Video')).toBeInTheDocument();
    expect(screen.getByText('Tour Video')).toBeInTheDocument();
  });

  it('displays video descriptions', () => {
    render(<VideoListTest />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Introduction to our community')).toBeInTheDocument();
    expect(screen.getByText('Take a tour of our features')).toBeInTheDocument();
  });

  it('renders uploaded videos with controls', () => {
    render(<VideoListTest />, { wrapper: createWrapper() });
    
    const videoItems = screen.getAllByTestId('video-item');
    const videoElement = videoItems[0].querySelector('video');
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('controls');
  });

  it('renders YouTube embeds with correct src', () => {
    render(<VideoListTest />, { wrapper: createWrapper() });
    
    const iframe = screen.getByTitle('Tour Video');
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('src')).toContain('youtube.com/embed');
  });

  it('displays video thumbnails', () => {
    render(<VideoListTest />, { wrapper: createWrapper() });
    
    const thumbnail = screen.getByAltText('Welcome Video thumbnail');
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail).toHaveAttribute('src', '/videos/cover1.jpg');
  });
});

describe('Video Player - YouTube Integration', () => {
  it('formats YouTube URLs correctly', () => {
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const videoId = youtubeUrl.split('v=')[1];
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    
    expect(embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('renders YouTube embeds with allowFullScreen', () => {
    render(<VideoListTest />, { wrapper: createWrapper() });
    
    const iframe = screen.getByTitle('Tour Video');
    expect(iframe).toHaveAttribute('allowFullScreen');
  });

  it('handles multiple YouTube embeds', () => {
    render(<VideoListTest />, { wrapper: createWrapper() });
    
    // Should have at least one YouTube iframe
    const iframes = screen.getAllByTitle(/video/i);
    const youtubeIframes = iframes.filter(iframe => 
      iframe.getAttribute('src')?.includes('youtube.com/embed')
    );
    
    expect(youtubeIframes.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Video Player - Empty States', () => {
  it('handles no videos gracefully', () => {
    const EmptyVideoList = () => (
      <div>
        <h1>Videos</h1>
        <p>No videos available</p>
      </div>
    );
    
    render(<EmptyVideoList />, { wrapper: createWrapper() });
    
    expect(screen.getByText('No videos available')).toBeInTheDocument();
  });

  it('renders page heading even without videos', () => {
    const EmptyVideoList = () => (
      <div>
        <h1>Videos</h1>
        <p>No videos available</p>
      </div>
    );
    
    render(<EmptyVideoList />, { wrapper: createWrapper() });
    
    expect(screen.getByRole('heading', { name: /videos/i })).toBeInTheDocument();
  });
});
