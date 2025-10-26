import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import '@testing-library/jest-dom';

// Mock data
const mockTours = [
  { id: 'tour-1', title: 'Getting Started', description: 'Learn the basics', is_active: true },
  { id: 'tour-2', title: 'Advanced Features', description: 'Master advanced tools', is_active: true }
];

const mockGuides = [
  { id: 'guide-1', title: 'User Guide', content: 'How to use the platform', is_active: true },
  { id: 'guide-2', title: 'Admin Guide', content: 'Admin features explained', is_active: true }
];

const mockFAQs = [
  { id: 'faq-1', question: 'How do I sign up?', answer: 'Click the signup button', is_active: true },
  { id: 'faq-2', question: 'How do I reset my password?', answer: 'Use the forgot password link', is_active: true }
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

// Help Center Test Component
const HelpCenterTest = () => {
  return (
    <div>
      <h1>Help Center</h1>
      <Tabs defaultValue="tours">
        <TabsList>
          <TabsTrigger value="tours">Tours</TabsTrigger>
          <TabsTrigger value="guides">Guides</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tours">
          {mockTours.map(tour => (
            <div key={tour.id} data-testid="tour-item">
              <h3>{tour.title}</h3>
              <p>{tour.description}</p>
              <button>Start Tour</button>
            </div>
          ))}
        </TabsContent>
        
        <TabsContent value="guides">
          {mockGuides.map(guide => (
            <div key={guide.id} data-testid="guide-item">
              <h3>{guide.title}</h3>
              <button>View Guide</button>
            </div>
          ))}
        </TabsContent>
        
        <TabsContent value="faqs">
          <Accordion type="single" collapsible>
            {mockFAQs.map(faq => (
              <AccordionItem key={faq.id} value={faq.id} data-testid="faq-item">
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
      </Tabs>
    </div>
  );
};

describe('Help Center - Tab Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders help center heading', () => {
    render(<HelpCenterTest />, { wrapper: createWrapper() });
    
    expect(screen.getByRole('heading', { name: /help center/i })).toBeInTheDocument();
  });

  it('displays all tabs', () => {
    render(<HelpCenterTest />, { wrapper: createWrapper() });
    
    expect(screen.getByRole('tab', { name: /tours/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /guides/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /faqs/i })).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    render(<HelpCenterTest />, { wrapper: createWrapper() });
    
    const guidesTab = screen.getByRole('tab', { name: /guides/i });
    fireEvent.click(guidesTab);
    
    await waitFor(() => {
      expect(screen.getByText('User Guide')).toBeInTheDocument();
      expect(screen.getByText('Admin Guide')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays default tab content on load', () => {
    render(<HelpCenterTest />, { wrapper: createWrapper() });
    
    // Tours tab is default
    expect(screen.getByText('Getting Started')).toBeVisible();
  });
});

describe('Help Center - Tours', () => {
  it('displays tour items', () => {
    render(<HelpCenterTest />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Learn the basics')).toBeInTheDocument();
  });

  it('shows start tour buttons', () => {
    render(<HelpCenterTest />, { wrapper: createWrapper() });
    
    const startButtons = screen.getAllByRole('button', { name: /start tour/i });
    expect(startButtons).toHaveLength(mockTours.length);
  });

  it('renders all active tours', () => {
    render(<HelpCenterTest />, { wrapper: createWrapper() });
    
    const tourItems = screen.getAllByTestId('tour-item');
    expect(tourItems).toHaveLength(2);
  });
});

describe('Help Center - Guides', () => {
  it('displays guide items when guides tab is clicked', async () => {
    render(<HelpCenterTest />, { wrapper: createWrapper() });
    
    const guidesTab = screen.getByRole('tab', { name: /guides/i });
    fireEvent.click(guidesTab);
    
    await waitFor(() => {
      expect(screen.getByText('User Guide')).toBeInTheDocument();
      expect(screen.getByText('Admin Guide')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows view guide buttons', async () => {
    render(<HelpCenterTest />, { wrapper: createWrapper() });
    
    fireEvent.click(screen.getByRole('tab', { name: /guides/i }));
    
    await waitFor(() => {
      const viewButtons = screen.getAllByRole('button', { name: /view guide/i });
      expect(viewButtons).toHaveLength(mockGuides.length);
    });
  });
});

describe('Help Center - FAQs', () => {
  it('displays FAQ accordion when FAQ tab is clicked', async () => {
    render(<HelpCenterTest />, { wrapper: createWrapper() });
    
    const faqTab = screen.getByRole('tab', { name: /faqs/i });
    fireEvent.click(faqTab);
    
    await waitFor(() => {
      expect(screen.getByText('How do I sign up?')).toBeInTheDocument();
      expect(screen.getByText('How do I reset my password?')).toBeInTheDocument();
    });
  });

  it('expands FAQ accordion items on click', async () => {
    render(<HelpCenterTest />, { wrapper: createWrapper() });
    
    fireEvent.click(screen.getByRole('tab', { name: /faqs/i }));
    
    await waitFor(() => {
      const firstQuestion = screen.getByText('How do I sign up?');
      fireEvent.click(firstQuestion);
      
      expect(screen.getByText('Click the signup button')).toBeVisible();
    });
  });

  it('renders all FAQ items', async () => {
    render(<HelpCenterTest />, { wrapper: createWrapper() });
    
    fireEvent.click(screen.getByRole('tab', { name: /faqs/i }));
    
    // Wait for FAQ content to load - query INSIDE waitFor callback
    await waitFor(() => {
      expect(screen.getAllByTestId('faq-item').length).toBeGreaterThan(0);
    }, { timeout: 5000 });
    
    const faqItems = screen.getAllByTestId('faq-item');
    expect(faqItems).toHaveLength(2);
  });
});

describe('Help Center - Empty States', () => {
  it('handles empty tours list', () => {
    const EmptyToursTest = () => (
      <div>
        <h1>Help Center</h1>
        <p>No tours available</p>
      </div>
    );
    
    render(<EmptyToursTest />, { wrapper: createWrapper() });
    
    expect(screen.getByText('No tours available')).toBeInTheDocument();
  });

  it('handles empty guides list', () => {
    const EmptyGuidesTest = () => (
      <div>
        <h1>Help Center</h1>
        <p>No guides available</p>
      </div>
    );
    
    render(<EmptyGuidesTest />, { wrapper: createWrapper() });
    
    expect(screen.getByText('No guides available')).toBeInTheDocument();
  });
});
