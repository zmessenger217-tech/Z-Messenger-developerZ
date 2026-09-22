import React, { StrictMode, ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-amber-50 p-6 text-center font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-xl border border-amber-200">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              !
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-neutral-600 mb-6">
              The application encountered an unexpected state. You can reload to restore your session.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold hover:shadow-lg transition-all cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
