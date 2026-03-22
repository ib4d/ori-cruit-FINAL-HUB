import React from "react";
import toast from "react-hot-toast";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

type ErrorBoundaryProps = React.PropsWithChildren<{}>;

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    toast.error(`An unexpected error occurred: ${error.message}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground p-8">
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">Something went wrong</h1>
          <p className="text-muted-foreground mb-4 text-center">The application encountered an unexpected issue. Please refresh the page or contact support.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-primary-foreground uppercase text-xs font-black tracking-widest"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
