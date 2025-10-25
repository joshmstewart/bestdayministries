import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

// Mock comment component for testing
const CommentDisplay = ({ 
  comment, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel 
}: { 
  comment: any;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (content: string) => void;
  onCancel: () => void;
}) => {
  const [editContent, setEditContent] = React.useState(comment.content);

  return (
    <div data-testid="comment" className="comment">
      <div className="flex items-center gap-2">
        <span data-testid="author-name">{comment.author.display_name}</span>
        {comment.author.role && (
          <span data-testid="role-badge" className="role-badge">
            {comment.author.role === 'caregiver' ? 'Guardian' : comment.author.role}
          </span>
        )}
      </div>
      
      {isEditing ? (
        <div>
          <textarea
            data-testid="edit-textarea"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
          />
          <button onClick={() => onSave(editContent)}>Save</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      ) : (
        <>
          <p data-testid="comment-content">{comment.content}</p>
          {comment.updated_at && 
            new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 60000 && (
            <span data-testid="edited-indicator">(edited)</span>
          )}
          {comment.isAuthor && (
            <button onClick={onEdit}>Edit</button>
          )}
        </>
      )}
      
      {comment.audio_url && (
        <audio data-testid="audio-player" controls src={comment.audio_url} />
      )}
    </div>
  );
};

import React from 'react';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Discussion Comments', () => {
  describe('Comment Display', () => {
    it('renders comment with author and content', () => {
      const comment = {
        id: 'comment-1',
        content: 'This is a test comment',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z',
        author: {
          id: 'author-1',
          display_name: 'Test Author',
          avatar_number: 1
        },
        isAuthor: false
      };

      const mockHandlers = {
        onEdit: () => {},
        onSave: () => {},
        onCancel: () => {}
      };

      render(
        <TestWrapper>
          <CommentDisplay 
            comment={comment} 
            isEditing={false}
            {...mockHandlers}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('author-name')).toHaveTextContent('Test Author');
      expect(screen.getByTestId('comment-content')).toHaveTextContent('This is a test comment');
    });

    it('displays Guardian badge for caregiver role', () => {
      const comment = {
        id: 'comment-1',
        content: 'Comment',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z',
        author: {
          id: 'author-1',
          display_name: 'Guardian User',
          role: 'caregiver',
          avatar_number: 1
        },
        isAuthor: false
      };

      const mockHandlers = {
        onEdit: () => {},
        onSave: () => {},
        onCancel: () => {}
      };

      render(
        <TestWrapper>
          <CommentDisplay 
            comment={comment} 
            isEditing={false}
            {...mockHandlers}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('role-badge')).toHaveTextContent('Guardian');
    });

    it('displays role badge for bestie', () => {
      const comment = {
        id: 'comment-1',
        content: 'Comment',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z',
        author: {
          id: 'author-1',
          display_name: 'Bestie User',
          role: 'bestie',
          avatar_number: 1
        },
        isAuthor: false
      };

      const mockHandlers = {
        onEdit: () => {},
        onSave: () => {},
        onCancel: () => {}
      };

      render(
        <TestWrapper>
          <CommentDisplay 
            comment={comment} 
            isEditing={false}
            {...mockHandlers}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('role-badge')).toHaveTextContent('bestie');
    });

    it('does not display role badge when role is missing', () => {
      const comment = {
        id: 'comment-1',
        content: 'Comment',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z',
        author: {
          id: 'author-1',
          display_name: 'User',
          avatar_number: 1
        },
        isAuthor: false
      };

      const mockHandlers = {
        onEdit: () => {},
        onSave: () => {},
        onCancel: () => {}
      };

      render(
        <TestWrapper>
          <CommentDisplay 
            comment={comment} 
            isEditing={false}
            {...mockHandlers}
          />
        </TestWrapper>
      );

      expect(screen.queryByTestId('role-badge')).not.toBeInTheDocument();
    });
  });

  describe('Audio Recording Display', () => {
    it('displays audio player when audio_url is present', () => {
      const comment = {
        id: 'comment-1',
        content: 'Comment with audio',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z',
        audio_url: 'https://example.com/audio.mp3',
        author: {
          id: 'author-1',
          display_name: 'Author',
          avatar_number: 1
        },
        isAuthor: false
      };

      const mockHandlers = {
        onEdit: () => {},
        onSave: () => {},
        onCancel: () => {}
      };

      render(
        <TestWrapper>
          <CommentDisplay 
            comment={comment} 
            isEditing={false}
            {...mockHandlers}
          />
        </TestWrapper>
      );

      const audioPlayer = screen.getByTestId('audio-player');
      expect(audioPlayer).toBeInTheDocument();
      expect(audioPlayer).toHaveAttribute('src', 'https://example.com/audio.mp3');
    });

    it('does not display audio player when audio_url is missing', () => {
      const comment = {
        id: 'comment-1',
        content: 'Comment without audio',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z',
        author: {
          id: 'author-1',
          display_name: 'Author',
          avatar_number: 1
        },
        isAuthor: false
      };

      const mockHandlers = {
        onEdit: () => {},
        onSave: () => {},
        onCancel: () => {}
      };

      render(
        <TestWrapper>
          <CommentDisplay 
            comment={comment} 
            isEditing={false}
            {...mockHandlers}
          />
        </TestWrapper>
      );

      expect(screen.queryByTestId('audio-player')).not.toBeInTheDocument();
    });
  });

  describe('Edit Indicator', () => {
    it('shows edited indicator when updated after 60 seconds', () => {
      const comment = {
        id: 'comment-1',
        content: 'Edited comment',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:02:00Z', // 2 minutes later
        author: {
          id: 'author-1',
          display_name: 'Author',
          avatar_number: 1
        },
        isAuthor: false
      };

      const mockHandlers = {
        onEdit: () => {},
        onSave: () => {},
        onCancel: () => {}
      };

      render(
        <TestWrapper>
          <CommentDisplay 
            comment={comment} 
            isEditing={false}
            {...mockHandlers}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('edited-indicator')).toHaveTextContent('(edited)');
    });

    it('does not show edited indicator when updated within 60 seconds', () => {
      const comment = {
        id: 'comment-1',
        content: 'Recent comment',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:30Z', // 30 seconds later
        author: {
          id: 'author-1',
          display_name: 'Author',
          avatar_number: 1
        },
        isAuthor: false
      };

      const mockHandlers = {
        onEdit: () => {},
        onSave: () => {},
        onCancel: () => {}
      };

      render(
        <TestWrapper>
          <CommentDisplay 
            comment={comment} 
            isEditing={false}
            {...mockHandlers}
          />
        </TestWrapper>
      );

      expect(screen.queryByTestId('edited-indicator')).not.toBeInTheDocument();
    });

    it('does not show edited indicator when not updated', () => {
      const comment = {
        id: 'comment-1',
        content: 'Unedited comment',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z',
        author: {
          id: 'author-1',
          display_name: 'Author',
          avatar_number: 1
        },
        isAuthor: false
      };

      const mockHandlers = {
        onEdit: () => {},
        onSave: () => {},
        onCancel: () => {}
      };

      render(
        <TestWrapper>
          <CommentDisplay 
            comment={comment} 
            isEditing={false}
            {...mockHandlers}
          />
        </TestWrapper>
      );

      expect(screen.queryByTestId('edited-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Edit Functionality', () => {
    it('shows Edit button for comment author', () => {
      const comment = {
        id: 'comment-1',
        content: 'My comment',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z',
        author: {
          id: 'author-1',
          display_name: 'Me',
          avatar_number: 1
        },
        isAuthor: true
      };

      const mockHandlers = {
        onEdit: () => {},
        onSave: () => {},
        onCancel: () => {}
      };

      render(
        <TestWrapper>
          <CommentDisplay 
            comment={comment} 
            isEditing={false}
            {...mockHandlers}
          />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('does not show Edit button for non-author', () => {
      const comment = {
        id: 'comment-1',
        content: 'Their comment',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z',
        author: {
          id: 'author-1',
          display_name: 'Someone',
          avatar_number: 1
        },
        isAuthor: false
      };

      const mockHandlers = {
        onEdit: () => {},
        onSave: () => {},
        onCancel: () => {}
      };

      render(
        <TestWrapper>
          <CommentDisplay 
            comment={comment} 
            isEditing={false}
            {...mockHandlers}
          />
        </TestWrapper>
      );

      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });

    it('shows textarea and Save/Cancel buttons in edit mode', () => {
      const comment = {
        id: 'comment-1',
        content: 'Original content',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z',
        author: {
          id: 'author-1',
          display_name: 'Me',
          avatar_number: 1
        },
        isAuthor: true
      };

      const mockHandlers = {
        onEdit: () => {},
        onSave: () => {},
        onCancel: () => {}
      };

      render(
        <TestWrapper>
          <CommentDisplay 
            comment={comment} 
            isEditing={true}
            {...mockHandlers}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('edit-textarea')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('textarea contains comment content in edit mode', () => {
      const comment = {
        id: 'comment-1',
        content: 'Content to edit',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z',
        author: {
          id: 'author-1',
          display_name: 'Me',
          avatar_number: 1
        },
        isAuthor: true
      };

      const mockHandlers = {
        onEdit: () => {},
        onSave: () => {},
        onCancel: () => {}
      };

      render(
        <TestWrapper>
          <CommentDisplay 
            comment={comment} 
            isEditing={true}
            {...mockHandlers}
          />
        </TestWrapper>
      );

      const textarea = screen.getByTestId('edit-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Content to edit');
    });

    it('hides comment content in edit mode', () => {
      const comment = {
        id: 'comment-1',
        content: 'Original content',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z',
        author: {
          id: 'author-1',
          display_name: 'Me',
          avatar_number: 1
        },
        isAuthor: true
      };

      const mockHandlers = {
        onEdit: () => {},
        onSave: () => {},
        onCancel: () => {}
      };

      render(
        <TestWrapper>
          <CommentDisplay 
            comment={comment} 
            isEditing={true}
            {...mockHandlers}
          />
        </TestWrapper>
      );

      expect(screen.queryByTestId('comment-content')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });
  });
});
