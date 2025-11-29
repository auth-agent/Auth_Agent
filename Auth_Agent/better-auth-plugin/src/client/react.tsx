import React, { useState } from "react";

export interface AuthAgentButtonProps {
  /**
   * Button text
   * @default "Sign in with Auth Agent"
   */
  text?: string;

  /**
   * CSS class name
   */
  className?: string;

  /**
   * Inline styles
   */
  style?: React.CSSProperties;

  /**
   * Callback URL after authentication
   */
  callbackURL?: string;

  /**
   * Callback before sign-in starts
   */
  onSignInStart?: () => void;

  /**
   * Error callback
   */
  onError?: (error: Error) => void;

  /**
   * Show loading state
   * @default true
   */
  showLoading?: boolean;

  /**
   * Disabled state
   */
  disabled?: boolean;
}

/**
 * Auth Agent authentication button for Better Auth
 *
 * Pre-styled button component for initiating Auth Agent OAuth flow.
 *
 * @example
 * ```tsx
 * import { AuthAgentButton } from "@auth-agent/better-auth-plugin/client/react";
 *
 * <AuthAgentButton
 *   callbackURL="/dashboard"
 *   onSignInStart={() => console.log("Starting auth...")}
 * />
 * ```
 */
export const AuthAgentButton: React.FC<AuthAgentButtonProps> = ({
  text = "Sign in with Auth Agent",
  className,
  style,
  callbackURL,
  onSignInStart,
  onError,
  showLoading = true,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      onSignInStart?.();

      // Build sign-in URL
      const url = new URL("/api/auth/sign-in/auth-agent", window.location.origin);
      if (callbackURL) {
        url.searchParams.set("callbackURL", callbackURL);
      }

      // Redirect to Auth Agent OAuth flow
      window.location.href = url.toString();
    } catch (error) {
      setLoading(false);
      onError?.(error as Error);
      console.error("Auth Agent sign-in error:", error);
    }
  };

  const isDisabled = disabled || loading;

  const defaultStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: 600,
    color: "#fff",
    backgroundColor: "#FF6B35",
    border: "none",
    borderRadius: "8px",
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.7 : 1,
    boxShadow: "0 4px 12px rgba(255, 107, 53, 0.4)",
    transition: "all 0.3s ease",
    fontFamily: "system-ui, -apple-system, sans-serif",
    ...style,
  };

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={className}
      style={defaultStyle}
      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isDisabled) {
          e.currentTarget.style.backgroundColor = "#FF5722";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 6px 16px rgba(255, 107, 53, 0.5)";
        }
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isDisabled) {
          e.currentTarget.style.backgroundColor = "#FF6B35";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 107, 53, 0.4)";
        }
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M12 2L2 7L12 12L22 7L12 2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 17L12 22L22 17"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 12L12 17L22 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{showLoading && loading ? "Redirecting..." : text}</span>
    </button>
  );
};

/**
 * Headless hook for Auth Agent authentication
 *
 * Use this if you want to build your own UI.
 *
 * @example
 * ```tsx
 * const { signIn, loading } = useAuthAgent();
 *
 * <button onClick={() => signIn({ callbackURL: "/dashboard" })}>
 *   {loading ? "Loading..." : "Sign in"}
 * </button>
 * ```
 */
export const useAuthAgent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signIn = async (options?: { callbackURL?: string }) => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL("/api/auth/sign-in/auth-agent", window.location.origin);
      if (options?.callbackURL) {
        url.searchParams.set("callbackURL", options.callbackURL);
      }

      window.location.href = url.toString();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Sign-in failed");
      setError(error);
      setLoading(false);
      throw error;
    }
  };

  return {
    signIn,
    loading,
    error,
  };
};
