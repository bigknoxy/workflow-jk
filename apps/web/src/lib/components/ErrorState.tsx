/**
 * Error state component for displaying error messages.
 * Can be used as a full error page or inline error display.
 */
import { CSSProperties } from "react";

interface ErrorStateProps {
  error?: Error | string;
  fullPage?: boolean;
  title?: string;
  onRetry?: () => void;
}

function getErrorMessage(error: Error | string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return error;
}

export function ErrorState({ error, fullPage = false, title = "Something went wrong", onRetry }: ErrorStateProps) {
  const message = getErrorMessage(error ?? "An unexpected error occurred");
  
  const container: CSSProperties = fullPage
    ? {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
      }
    : {
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: "1rem",
        border: "1px solid var(--border)",
        borderRadius: "0.5rem",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
      };

  const titleStyle: CSSProperties = fullPage
    ? { fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)" }
    : { fontSize: "1rem", fontWeight: 600, color: "#ef4444" };

  const messageStyle: CSSProperties = fullPage
    ? { fontSize: "1rem", color: "var(--muted)", maxWidth: "32rem" }
    : { fontSize: "0.875rem", color: "var(--muted)" };

  return (
    <div style={container}>
      <div style={titleStyle}>{title}</div>
      <div style={messageStyle}>{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--background)",
            backgroundColor: "var(--accent)",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * Error boundary component for catching React errors.
 */
"use client";

import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorState
          error={this.state.error}
          fullPage
          title="Something went wrong"
          onRetry={this.reset}
        />
      );
    }

    return this.props.children;
  }
}