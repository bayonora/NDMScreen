import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  onReset?: () => void;
  resetKey?: any;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in view:", error, errorInfo);
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center bg-[#0f0d0c] text-[#e6e2da]">
          <div className="w-24 h-24 mb-6 text-red-900/80 animate-pulse flex items-center justify-center">
            <AlertTriangle size={64} />
          </div>
          <h2 className="text-3xl font-display text-[#c1a063] uppercase tracking-widest mb-4">
            Catástrofe Inesperada
          </h2>
          <p className="text-[#8b7355] max-w-md mb-8">
            El tejido mágico de esta vista se ha roto de forma inesperada. Los arcanistas han registrado el error. 
          </p>
          <div className="bg-[#1a1614] border border-red-900/30 p-4 rounded-sm text-left max-w-lg w-full mb-8 overflow-auto max-h-32 font-mono text-xs text-red-400/80">
            {this.state.error?.toString()}
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 bg-[#1a1614] border border-[#c1a063] text-[#c1a063] px-6 py-3 rounded hover:bg-[#c1a063] hover:text-black transition-colors uppercase tracking-widest text-sm font-bold shadow-[0_0_15px_rgba(193,160,99,0.3)]"
          >
            <RefreshCcw size={16} />
            Restaurar Vista
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
