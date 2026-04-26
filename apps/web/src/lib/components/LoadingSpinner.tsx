/**
 * Loading spinner component for indicating loading states.
 * Can be used inline or as a full-screen overlay.
 */
import { CSSProperties } from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  message?: string;
}

const sizeStyles = {
  sm: { width: "1rem", height: "1rem", borderWidth: "2px" },
  md: { width: "2rem", height: "2rem", borderWidth: "3px" },
  lg: { width: "3rem", height: "3rem", borderWidth: "4px" },
};

export function LoadingSpinner({ size = "md", fullScreen = false, message }: LoadingSpinnerProps) {
  const style = sizeStyles[size];
  const container: CSSProperties = fullScreen
    ? {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1rem",
      }
    : {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
      };

  return (
    <div style={container}>
      <div
        style={{
          ...style,
          border: "var(--border)",
          borderTopColor: "var(--accent)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      {message && (
        <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>{message}</p>
      )}
      <style>
        {`@keyframes spin {
          to { transform: rotate(360deg); }
        }`}
      </style>
    </div>
  );
}