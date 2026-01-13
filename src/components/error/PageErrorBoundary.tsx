import { Component, ErrorInfo, ReactNode } from "react";
import { captureException } from "@sentry/react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Page-level Error Boundary
 * Wraps entire pages to catch and display errors gracefully
 */
export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("PageErrorBoundary caught an error:", error, errorInfo);
    
    // Send error to Sentry
    captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
    
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-6 max-w-md px-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
              <p className="text-muted-foreground">
                We apologize for the inconvenience. Please try refreshing the page.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleRetry} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={() => window.location.href = "/"}>
                Go Home
              </Button>
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 text-left bg-muted p-4 rounded-lg text-sm">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap text-destructive">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Section-level Error Boundary
 * For wrapping sections within a page - doesn't take over the whole screen
 */
interface SectionErrorBoundaryProps extends Props {
  sectionName?: string;
}

interface SectionErrorState extends State {
  retryCount: number;
}

export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorState> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<SectionErrorState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`SectionErrorBoundary (${this.props.sectionName || "unknown"}) caught an error:`, error, errorInfo);
    
    captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
        sectionName: this.props.sectionName,
      },
    });
    
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState(prev => ({ 
      hasError: false, 
      error: null, 
      retryCount: prev.retryCount + 1 
    }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">
            {this.props.sectionName ? `Error loading ${this.props.sectionName}` : "Error loading section"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            This section encountered an error. Other parts of the page should still work.
          </p>
          <Button onClick={this.handleRetry} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
