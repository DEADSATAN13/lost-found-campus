import React from 'react';

/**
 * Top-level ErrorBoundary to catch rendering exceptions and provide a friendly reload state.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary captured exception:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-ink">
          <div className="bg-white border border-line rounded-lg p-8 max-w-md w-full shadow-notice text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-mustard-tint flex items-center justify-center text-mustard text-2xl font-serif">
              !
            </div>
            <h1 className="font-serif text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted text-sm mb-6">
              An unexpected error occurred while rendering this campus notice. Don't worry, your data is safe.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full bg-moss hover:bg-moss-dark text-paper font-medium py-2.5 px-4 rounded transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
