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
          className="m-4 p-6 bg-white border border-[#DADCE0] rounded-2xl shadow-md text-slate-800 max-w-2xl mx-auto"
        >
          <div className="flex items-center space-x-3 mb-3">
            <span className="p-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xl" aria-hidden="true">
              ⚠️
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              {this.props.title || 'Component Error Occurred'}
            </h2>
          </div>
          <p className="text-slate-600 text-sm mb-5 leading-relaxed">
            Something went wrong while rendering this section: {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="btn-touch px-4 py-2 bg-maroon-800 hover:bg-maroon-900 text-white font-medium rounded-xl shadow-xs transition duration-150"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-touch px-4 py-2 bg-white hover:bg-slate-50 border border-[#DADCE0] text-slate-700 font-medium rounded-xl shadow-xs transition duration-150"
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
