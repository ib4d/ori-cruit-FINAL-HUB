import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Uncaught error:", event.error);
      setError(event.error);
      setHasError(true);
      toast.error(`An unexpected error occurred: ${event.error.message}`);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      setError(error);
      setHasError(true);
      toast.error(`An unexpected error occurred: ${error.message}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
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

  return <>{children}</>;
}
