import React from 'react';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in child component tree and displays fallback UI
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console (in production, send to error reporting service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // TODO: Send to error reporting service (Sentry, LogRocket, etc.)
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#1a1a2e] to-[#16213e] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#1a1a2e]/80 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <i className="ri-error-warning-line text-4xl text-red-400"></i>
            </div>
            
            {/* Error Message */}
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-gray-400 mb-6">
              We're sorry, but something unexpected happened. Please try again.
            </p>
            
            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-purple-400 hover:text-purple-300 text-sm">
                  View error details
                </summary>
                <pre className="mt-2 p-3 bg-black/50 rounded-lg text-xs text-red-300 overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <i className="ri-refresh-line"></i>
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <i className="ri-home-line"></i>
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
