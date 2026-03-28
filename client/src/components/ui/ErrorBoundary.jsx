import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (import.meta.env.PROD) {
      console.error('[ErrorBoundary]', {
        error:   error.toString(),
        stack:   errorInfo.componentStack,
        time:    new Date().toISOString(),
        url:     window.location.href,
      });
    }
  }

  handleReset = () => this.setState({ hasError: false, error: null, errorInfo: null });
  handleHome  = () => { this.setState({ hasError: false, error: null, errorInfo: null }); window.location.href = '/'; };

  render() {
    if (!this.state.hasError) return this.props.children;
    const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
    const T = (ar, en) => isRTL ? ar : en;
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8"  x2="12"   y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 mb-3">
            {T('حدث خطأ غير متوقع', 'Something went wrong')}
          </h1>
          <p className="text-neutral-500 text-sm mb-2">
            {T('حدث خطأ في التطبيق. يرجى إعادة المحاولة.', 'An unexpected error occurred. Please try again.')}
          </p>
          {import.meta.env.DEV && this.state.error && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl text-start border border-red-100">
              <p className="text-xs font-mono text-red-700 font-semibold mb-1">{this.state.error.toString()}</p>
              {this.state.errorInfo && (
                <details className="mt-2">
                  <summary className="text-xs text-red-500 cursor-pointer">Stack trace</summary>
                  <pre className="text-xs text-red-400 mt-2 overflow-auto max-h-32 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          )}
          <div className="flex gap-3 justify-center mt-6">
            <button onClick={this.handleReset} className="btn-secondary">
              🔄 {T('إعادة المحاولة', 'Try Again')}
            </button>
            <button onClick={this.handleHome} className="btn-primary">
              🏠 {T('الصفحة الرئيسية', 'Go Home')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
