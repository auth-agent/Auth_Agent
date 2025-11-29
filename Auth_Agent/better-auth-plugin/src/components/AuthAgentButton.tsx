/**
 * Auth Agent Button Component for Better Auth
 *
 * This component provides the official Auth Agent sign-in button
 * with enforced branding and styling.
 */

import React from 'react';

// Branding colors - enforced
const BRAND_COLORS = {
  primary: '#FF6B35',
  primaryHover: '#FF5722',
  text: '#fff',
} as const;

export interface AuthAgentButtonProps {
  /**
   * Callback URL after successful authentication
   */
  callbackURL?: string;

  /**
   * Button text - should contain "Auth Agent" for branding
   * @default "Sign in with Auth Agent"
   */
  children?: React.ReactNode;

  /**
   * Custom CSS class - only for layout/spacing, colors are enforced
   */
  className?: string;

  /**
   * Custom styles - color properties are protected and cannot be overridden
   */
  style?: React.CSSProperties;

  /**
   * Callback before sign in starts
   */
  onSignInStart?: () => void;

  /**
   * Callback on error
   */
  onError?: (error: Error) => void;
}

/**
 * Auth Agent Sign-In Button
 *
 * Official Auth Agent button with enforced branding.
 * Colors cannot be customized to maintain brand consistency.
 *
 * @example
 * ```tsx
 * import { AuthAgentButton } from '@auth-agent/better-auth-plugin/components';
 *
 * <AuthAgentButton callbackURL="/dashboard">
 *   Sign in with Auth Agent
 * </AuthAgentButton>
 * ```
 */
export const AuthAgentButton: React.FC<AuthAgentButtonProps> = ({
  callbackURL,
  children,
  className,
  style,
  onSignInStart,
  onError,
}) => {
  const [loading, setLoading] = React.useState(false);
  const buttonText = children || 'Sign in with Auth Agent';

  const handleSignIn = async () => {
    try {
      setLoading(true);
      onSignInStart?.();

      // Construct the auth URL
      const url = new URL('/api/auth/sign-in/auth-agent', window.location.origin);
      if (callbackURL) {
        url.searchParams.set('callbackURL', callbackURL);
      }

      // Redirect to auth flow
      window.location.href = url.toString();
    } catch (error) {
      setLoading(false);
      onError?.(error as Error);
      console.error('Auth Agent sign in error:', error);
    }
  };

  // Filter out color properties from custom style
  const allowedStyle = React.useMemo(() => {
    if (!style) return {};

    const colorProps = [
      'color', 'background', 'backgroundColor', 'borderColor',
      'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
    ];

    const filtered: any = {};
    for (const key in style) {
      if (style.hasOwnProperty(key) && !colorProps.includes(key)) {
        filtered[key] = (style as any)[key];
      }
    }
    return filtered as React.CSSProperties;
  }, [style]);

  // Enforced branding styles
  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    opacity: loading ? 0.7 : 1,
    ...allowedStyle,
  };

  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (buttonRef.current) {
      buttonRef.current.style.setProperty('color', BRAND_COLORS.text, 'important');
      buttonRef.current.style.setProperty('background', loading ? '#d1d5db' : BRAND_COLORS.primary, 'important');
      buttonRef.current.style.setProperty('box-shadow', loading ? 'none' : '0 4px 12px rgba(255, 107, 53, 0.4)', 'important');
    }
  }, [loading]);

  return (
    <button
      ref={buttonRef}
      onClick={handleSignIn}
      disabled={loading}
      className={className}
      style={buttonStyle}
      data-auth-agent-button="true"
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.setProperty('transform', 'translateY(-2px)', 'important');
          e.currentTarget.style.setProperty('background', BRAND_COLORS.primaryHover, 'important');
          e.currentTarget.style.setProperty('box-shadow', '0 6px 16px rgba(255, 107, 53, 0.5)', 'important');
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.currentTarget.style.setProperty('transform', 'translateY(0)', 'important');
          e.currentTarget.style.setProperty('background', BRAND_COLORS.primary, 'important');
          e.currentTarget.style.setProperty('box-shadow', '0 4px 12px rgba(255, 107, 53, 0.4)', 'important');
        }
      }}
    >
      <img
        src="/AA.png"
        alt="Auth Agent"
        width={24}
        height={24}
        style={{ objectFit: 'contain', display: 'block' }}
      />
      <span>{loading ? 'Redirecting...' : buttonText}</span>
    </button>
  );
};

export default AuthAgentButton;
