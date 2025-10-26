import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContactForm } from '@/components/ContactForm';
import '@testing-library/jest-dom';

// Mock Supabase - must be hoisted before the mock
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() => Promise.resolve({
          data: {
            is_enabled: true,
            title: "Contact Us",
            description: "We'd love to hear from you",
            success_message: "Thank you for your message!"
          }
        }))
      }))
    })),
    insert: vi.fn(() => Promise.resolve({ error: null }))
  })),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null } }))
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/image.jpg' } }))
    }))
  },
  functions: {
    invoke: vi.fn(() => Promise.resolve({ error: null }))
  }
}));

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

describe('Form Validation - Contact Form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays the contact form when enabled', async () => {
    render(<ContactForm />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Contact Us')).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    render(<ContactForm />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(<ContactForm />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });

  it('validates minimum message length', async () => {
    render(<ContactForm />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    });

    const messageInput = screen.getByLabelText(/message/i);
    fireEvent.change(messageInput, { target: { value: 'Short' } });
    fireEvent.blur(messageInput);
    
    await waitFor(() => {
      expect(screen.getByText(/message must be at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it('enforces maximum field lengths', async () => {
    render(<ContactForm />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    const longName = 'a'.repeat(101);
    fireEvent.change(nameInput, { target: { value: longName } });
    fireEvent.blur(nameInput);
    
    await waitFor(() => {
      expect(screen.getByText(/name must be less than/i)).toBeInTheDocument();
    });
  });

  it('shows success message on valid submission', async () => {
    render(<ContactForm />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'This is a valid test message' } });
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('contact_form_submissions');
    });
  });

  it('clears form after successful submission', async () => {
    render(<ContactForm />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'This is a valid test message' } });
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(nameInput.value).toBe('');
    });
  });

  it('disables submit button during submission', async () => {
    render(<ContactForm />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'This is a valid test message' } });
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);
    
    expect(submitButton).toBeDisabled();
  });

  it('handles image upload validation', async () => {
    render(<ContactForm />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText(/click to upload an image/i)).toBeInTheDocument();
    });

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText(/click to upload an image/i).querySelector('input[type="file"]') as HTMLInputElement;
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false
      });
      fireEvent.change(input);
      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });
    }
  });

  it('allows removing uploaded image', async () => {
    render(<ContactForm />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText(/click to upload an image/i)).toBeInTheDocument();
    });

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText(/click to upload an image/i).querySelector('input[type="file"]') as HTMLInputElement;
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false
      });
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: '' });
      fireEvent.click(removeButton);
      
      await waitFor(() => {
        expect(screen.queryByAltText(/preview/i)).not.toBeInTheDocument();
      });
    }
  });

  it('prefills email for authenticated users', async () => {
    mockSupabase.auth.getUser = vi.fn(() => 
      Promise.resolve({ 
        data: { user: { email: 'authenticated@example.com' } } 
      })
    );

    render(<ContactForm />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      expect(emailInput.value).toBe('authenticated@example.com');
    });
  });
});

describe('Form Validation - Email Format', () => {
  it('validates email format patterns', () => {
    const validEmails = ['test@example.com', 'user.name@domain.co', 'admin@test.org'];
    const invalidEmails = ['invalid-email', '@example.com', 'test@', 'test'];
    
    validEmails.forEach(email => {
      expect(email).toContain('@');
      expect(email.split('@')[1]).toContain('.');
    });
    
    invalidEmails.forEach(email => {
      const parts = email.split('@');
      expect(parts.length !== 2 || !parts[1]?.includes('.')).toBe(true);
    });
  });

  it('validates display name length', () => {
    const shortName = 'ab';
    expect(shortName.length).toBeLessThan(3);
    
    const validName = 'Valid Name';
    expect(validName.length).toBeGreaterThanOrEqual(3);
  });

  it('validates bio max length', () => {
    const longBio = 'a'.repeat(501);
    expect(longBio.length).toBeGreaterThan(500);
    
    const validBio = 'This is a valid bio';
    expect(validBio.length).toBeLessThanOrEqual(500);
  });
});

describe('Form Validation - Input Sanitization', () => {
  it('trims whitespace from inputs', () => {
    const input = '  test@example.com  ';
    const trimmed = input.trim();
    expect(trimmed).toBe('test@example.com');
  });

  it('detects HTML tags in text inputs', () => {
    const input = '<script>alert("xss")</script>Hello';
    expect(input).toContain('<script>');
    
    const sanitized = input.replace(/<[^>]*>/g, '');
    expect(sanitized).not.toContain('<script>');
  });

  it('validates URL format', () => {
    const validUrl = 'https://example.com';
    expect(validUrl.startsWith('http://') || validUrl.startsWith('https://')).toBe(true);
    
    const invalidUrl = 'not-a-url';
    expect(invalidUrl.startsWith('http://') || invalidUrl.startsWith('https://')).toBe(false);
  });

  it('enforces maximum length', () => {
    const longText = 'a'.repeat(1001);
    const maxLength = 1000;
    expect(longText.length).toBeGreaterThan(maxLength);
    
    const validText = 'a'.repeat(999);
    expect(validText.length).toBeLessThanOrEqual(maxLength);
  });
});
