import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-8">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-foreground">Something went wrong</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
