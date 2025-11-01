/**
 * React Component: Sign In with Auth Agent Button
 *
 * Usage:
 * <AuthAgentButton
 *   authServerUrl="http://localhost:3000"
 *   clientId="your_client_id"
 *   redirectUri="https://yoursite.com/callback"
 * />
 */

import React from 'react';
import { createAuthAgentClient, AuthAgentConfig } from './auth-agent-sdk';

export interface AuthAgentButtonProps extends AuthAgentConfig {
  /**
   * Button text
   */
  children?: React.ReactNode;

  /**
   * Custom CSS class
   */
  className?: string;

  /**
   * Custom styles
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

export const AuthAgentButton: React.FC<AuthAgentButtonProps> = ({
  authServerUrl,
  clientId,
  redirectUri,
  scope,
  children,
  className,
  style,
  onSignInStart,
  onError,
}) => {
  const handleSignIn = async () => {
    try {
      onSignInStart?.();

      const client = createAuthAgentClient({
        authServerUrl,
        clientId,
        redirectUri,
        scope,
      });

      await client.signIn();
    } catch (error) {
      onError?.(error as Error);
      console.error('Auth Agent sign in error:', error);
    }
  };

  const defaultStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
    ...style,
  };

  return (
    <button
      onClick={handleSignIn}
      className={className}
      style={defaultStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
          fill="currentColor"
        />
        <path
          d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
          fill="currentColor"
        />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
      {children || 'Sign in with Auth Agent'}
    </button>
  );
};

/**
 * Minimal/Text-only version
 */
export const AuthAgentButtonMinimal: React.FC<AuthAgentButtonProps> = ({
  authServerUrl,
  clientId,
  redirectUri,
  scope,
  children,
  className,
  style,
  onSignInStart,
  onError,
}) => {
  const handleSignIn = async () => {
    try {
      onSignInStart?.();

      const client = createAuthAgentClient({
        authServerUrl,
        clientId,
        redirectUri,
        scope,
      });

      await client.signIn();
    } catch (error) {
      onError?.(error as Error);
      console.error('Auth Agent sign in error:', error);
    }
  };

  const defaultStyle: React.CSSProperties = {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#667eea',
    background: 'transparent',
    border: '2px solid #667eea',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ...style,
  };

  return (
    <button
      onClick={handleSignIn}
      className={className}
      style={defaultStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#667eea';
        e.currentTarget.style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = '#667eea';
      }}
    >
      {children || 'Sign in with Auth Agent'}
    </button>
  );
};

export default AuthAgentButton;
