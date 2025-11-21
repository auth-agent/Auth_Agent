/**
 * Auth Agent React Components
 */

import React, { useState } from 'react';
import { createAuthAgentClient } from './index';

export interface AuthAgentButtonProps {
  clientId: string;
  redirectUri: string;
  authServerUrl?: string;
  text?: string;
  className?: string;
  style?: React.CSSProperties;
  scope?: string;
  onSignInStart?: () => void;
  onError?: (error: Error) => void;
}

export function AuthAgentButton(props: AuthAgentButtonProps) {
  const {
    clientId,
    redirectUri,
    authServerUrl = 'https://api.auth-agent.com',
    text = 'Sign in with Auth Agent',
    className,
    style,
    scope,
    onSignInStart,
    onError,
  } = props;

  // Auth Agent logo - always required for branding
  // Using GitHub raw URL as fallback since auth-agent.com/logo doesn't exist
  const LOGO_URL = 'https://raw.githubusercontent.com/auth-agent/auth-agent/master/logo/AA.png';

  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      onSignInStart?.();

      const client = createAuthAgentClient({
        authServerUrl,
        clientId,
        redirectUri,
        scope,
      });

      await client.signIn();
    } catch (error) {
      setLoading(false);
      onError?.(error as Error);
      console.error('Auth Agent sign in error:', error);
    }
  };

  const defaultStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
    background: loading ? '#d1d5db' : '#FF6B35',
    border: 'none',
    borderRadius: '8px',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
    boxShadow: loading ? 'none' : '0 4px 12px rgba(255, 107, 53, 0.4)',
    opacity: loading ? 0.7 : 1,
    ...style, // Allow style prop to override defaults
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!loading) {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.background = '#FF5722';
      e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 107, 53, 0.5)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!loading) {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.background = '#FF6B35';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.4)';
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className || 'auth-agent-button'}
      style={defaultStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img
        src={LOGO_URL}
        alt="Auth Agent"
        width={24}
        height={24}
        style={{
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0, // Prevent logo from shrinking
        }}
        onError={(e) => {
          // Fallback if logo fails to load - log but don't break
          console.warn('Auth Agent logo failed to load. Please ensure the logo is accessible.');
        }}
      />
      <span>{loading ? 'Redirecting...' : text}</span>
    </button>
  );
}
