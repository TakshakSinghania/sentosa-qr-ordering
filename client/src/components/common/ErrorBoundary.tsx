import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React error in dining interface:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-6 text-charcoal-950">
          <div className="glass-modal-panel w-full max-w-md rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl border border-cream-300">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 mx-auto flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-7 h-7 text-amber-800 stroke-[2]" />
            </div>

            <h2 className="font-serif text-xl font-bold text-charcoal-950 tracking-tight">
              Temporary Dining Interface Hiccup
            </h2>

            <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed font-light">
              We encountered an unexpected issue while rendering this page. Your order data and table session remain safe.
            </p>

            {this.state.error?.message && (
              <div className="p-3 bg-cream-100 rounded-xl border border-cream-300 text-left font-mono text-[11px] text-charcoal-700 max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-glass-primary w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="btn-glass-secondary w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
              >
                <Home className="w-4 h-4 text-charcoal-700" />
                <span>Home Portal</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
