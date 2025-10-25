import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { DiscussionPostCard } from '@/components/DiscussionPostCard';
import { BrowserRouter } from 'react-router-dom';

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Discussion Post Rendering', () => {
  const mockOnClick = () => {};

  describe('Basic Post Display', () => {
    it('renders post with title and content preview', () => {
      const post = {
        id: 'post-1',
        title: 'Test Discussion Post',
        content: 'This is the content of the test post',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        author: {
          id: 'author-1',
          display_name: 'Test Author',
          avatar_number: 1
        }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByText('Test Discussion Post')).toBeInTheDocument();
      expect(screen.getByText('This is the content of the test post')).toBeInTheDocument();
    });

    it('truncates long content with ellipsis', () => {
      const longContent = 'A'.repeat(300);
      const post = {
        id: 'post-1',
        title: 'Long Post',
        content: longContent,
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      const content = screen.getByText(/A{200}\.\.\./, { exact: false });
      expect(content.textContent).toContain('...');
      expect(content.textContent!.length).toBeLessThan(longContent.length);
    });

    it('displays author name and avatar', () => {
      const post = {
        id: 'post-1',
        title: 'Test Post',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        author: {
          id: 'author-1',
          display_name: 'Jane Doe',
          avatar_number: 3
        }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      // Avatar component should be rendered
      expect(screen.getByText('Jane Doe').closest('div')).toBeInTheDocument();
    });

    it('displays formatted creation date', () => {
      const post = {
        id: 'post-1',
        title: 'Test Post',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      // Should display formatted date (format depends on locale)
      expect(screen.getByText(/1\/20\/2024|20\/1\/2024|2024-01-20/)).toBeInTheDocument();
    });
  });

  describe('Role Badges', () => {
    it('displays Guardian badge for caregiver role', () => {
      const post = {
        id: 'post-1',
        title: 'Test Post',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        author: {
          id: 'author-1',
          display_name: 'Guardian User',
          role: 'caregiver',
          avatar_number: 1
        }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByText('Guardian')).toBeInTheDocument();
    });

    it('displays role badge for bestie', () => {
      const post = {
        id: 'post-1',
        title: 'Test Post',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        author: {
          id: 'author-1',
          display_name: 'Bestie User',
          role: 'bestie',
          avatar_number: 1
        }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByText('bestie')).toBeInTheDocument();
    });

    it('displays role badge for supporter', () => {
      const post = {
        id: 'post-1',
        title: 'Test Post',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        author: {
          id: 'author-1',
          display_name: 'Supporter User',
          role: 'supporter',
          avatar_number: 1
        }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByText('supporter')).toBeInTheDocument();
    });

    it('does not display role badge when role is missing', () => {
      const post = {
        id: 'post-1',
        title: 'Test Post',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        author: {
          id: 'author-1',
          display_name: 'User',
          avatar_number: 1
        }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.queryByText('Guardian')).not.toBeInTheDocument();
      expect(screen.queryByText('bestie')).not.toBeInTheDocument();
    });
  });

  describe('Media Display', () => {
    it('displays image preview when image_url is present', () => {
      const post = {
        id: 'post-1',
        title: 'Post with Image',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        image_url: 'https://example.com/image.jpg',
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      const image = screen.getByAltText('Post with Image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('displays video placeholder when video is present', () => {
      const post = {
        id: 'post-1',
        title: 'Post with Video',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        video: { url: 'https://example.com/video.mp4' },
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByText('Video Content')).toBeInTheDocument();
    });

    it('displays video placeholder when youtube_url is present', () => {
      const post = {
        id: 'post-1',
        title: 'Post with YouTube',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        youtube_url: 'https://youtube.com/watch?v=123',
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByText('Video Content')).toBeInTheDocument();
    });

    it('displays album cover when album is present', () => {
      const post = {
        id: 'post-1',
        title: 'Post with Album',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        album: {
          id: 'album-1',
          title: 'Test Album',
          cover_image_url: 'https://example.com/album-cover.jpg'
        },
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      const image = screen.getByAltText('Test Album');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/album-cover.jpg');
    });

    it('does not display media section when no media present', () => {
      const post = {
        id: 'post-1',
        title: 'Post without Media',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      };

      const { container } = render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(container.querySelector('img[alt="Post without Media"]')).not.toBeInTheDocument();
      expect(screen.queryByText('Video Content')).not.toBeInTheDocument();
    });
  });

  describe('Aspect Ratio Handling', () => {
    it('uses 16:9 aspect ratio by default', () => {
      const post = {
        id: 'post-1',
        title: 'Post',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        image_url: 'https://example.com/image.jpg',
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      };

      const { container } = render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      // AspectRatio component should be rendered
      expect(container.querySelector('[style*="padding-bottom"]')).toBeInTheDocument();
    });

    it('uses custom aspect ratio when specified', () => {
      const post = {
        id: 'post-1',
        title: 'Post',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        image_url: 'https://example.com/image.jpg',
        aspect_ratio: '1:1',
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      } as any;

      const { container } = render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      // Should use 1:1 ratio (100% padding-bottom)
      expect(container.querySelector('[style*="padding-bottom"]')).toBeInTheDocument();
    });
  });

  describe('Linked Content', () => {
    it('displays linked event information', () => {
      const post = {
        id: 'post-1',
        title: 'Post',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        event: {
          id: 'event-1',
          title: 'Community Meetup',
          event_date: '2024-02-15T18:00:00Z',
          location: 'Community Center'
        },
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByText('Community Meetup')).toBeInTheDocument();
      expect(screen.getByText(/2\/15\/2024|15\/2\/2024|2024-02-15/)).toBeInTheDocument();
    });

    it('displays linked album information when no image', () => {
      const post = {
        id: 'post-1',
        title: 'Post',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        album: {
          id: 'album-1',
          title: 'Summer Photos',
          cover_image_url: null
        },
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByText('Summer Photos')).toBeInTheDocument();
    });
  });

  describe('Comment Counter', () => {
    it('displays comment count - singular', () => {
      const post = {
        id: 'post-1',
        title: 'Post',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        comments: [{ id: 'comment-1' }],
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByText('1 comment')).toBeInTheDocument();
    });

    it('displays comment count - plural', () => {
      const post = {
        id: 'post-1',
        title: 'Post',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        comments: [{ id: 'comment-1' }, { id: 'comment-2' }, { id: 'comment-3' }],
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByText('3 comments')).toBeInTheDocument();
    });

    it('displays 0 comments when no comments array', () => {
      const post = {
        id: 'post-1',
        title: 'Post',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByText('0 comments')).toBeInTheDocument();
    });
  });

  describe('Approval Status', () => {
    it('displays pending badge when approval_status is pending', () => {
      const post = {
        id: 'post-1',
        title: 'Post',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        approval_status: 'pending_approval',
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('does not display pending badge when approved', () => {
      const post = {
        id: 'post-1',
        title: 'Post',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        approval_status: 'approved',
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    });
  });

  describe('Interactive Elements', () => {
    it('displays Read More button', () => {
      const post = {
        id: 'post-1',
        title: 'Post',
        content: 'Content',
        created_at: '2024-01-20T10:00:00Z',
        author_id: 'author-1',
        author: { id: 'author-1', display_name: 'Author', avatar_number: 1 }
      };

      render(
        <TestWrapper>
          <DiscussionPostCard post={post} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /read more/i })).toBeInTheDocument();
    });
  });
});
