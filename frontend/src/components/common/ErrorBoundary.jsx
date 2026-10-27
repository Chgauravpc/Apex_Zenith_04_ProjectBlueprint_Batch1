import React from 'react';

/**
 * Page and component level Error Boundary.
 * Catches JavaScript errors and displays an accessible recovery UI.
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          reset: this.handleReset,
        });
      }

      return (
        <div
          role="alert"
          className="m-4 p-6 bg-slate-800/90 border border-red-500/30 rounded-xl shadow-xl text-slate-100 max-w-2xl mx-auto"
        >
          <div className="flex items-center space-x-3 mb-3">
            <span className="p-2 bg-red-500/20 text-red-400 rounded-lg text-xl" aria-hidden="true">
              ⚠️
            </span>
            <h2 className="text-xl font-bold text-red-300">
              {this.props.title || 'Component Error Occurred'}
            </h2>
          </div>
          <p className="text-slate-300 text-sm mb-4">
            {this.state.error?.message || 'An unexpected error occurred while rendering this section.'}
          </p>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="btn-touch px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg shadow transition duration-150"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-touch px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition duration-150"
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

export default ErrorBoundary;
