// Auth Agent Widget Script
// This is served as a standalone JavaScript file that websites can include

export function generateWidgetScript(): string {
  return `
(function(window) {
  'use strict';

  class AuthAgentClient {
    constructor(config) {
      this.config = {
        scope: 'openid profile',
        ...config,
      };
    }

    generateRandomString(length = 43) {
      const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      const randomValues = new Uint8Array(length);
      crypto.getRandomValues(randomValues);
      return Array.from(randomValues)
        .map(x => charset[x % charset.length])
        .join('');
    }

    async sha256(plain) {
      const encoder = new TextEncoder();
      const data = encoder.encode(plain);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return this.base64UrlEncode(hash);
    }

    base64UrlEncode(buffer) {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary)
        .replace(/\\+/g, '-')
        .replace(/\\//g, '_')
        .replace(/=/g, '');
    }

    async generatePKCE() {
      const verifier = this.generateRandomString(128);
      const challenge = await this.sha256(verifier);
      return { verifier, challenge };
    }

    async signIn() {
      const { verifier, challenge } = await this.generatePKCE();
      const state = this.generateRandomString(32);

      sessionStorage.setItem('auth_agent_code_verifier', verifier);
      sessionStorage.setItem('auth_agent_state', state);

      const params = new URLSearchParams({
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        response_type: 'code',
        state: state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        scope: this.config.scope,
      });

      const authUrl = this.config.authServerUrl + '/authorize?' + params.toString();
      window.location.href = authUrl;
    }

    handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');

      if (!code || !state) {
        return null;
      }

      const storedState = sessionStorage.getItem('auth_agent_state');
      const codeVerifier = sessionStorage.getItem('auth_agent_code_verifier');

      if (state !== storedState) {
        throw new Error('State mismatch - possible CSRF attack');
      }

      if (!codeVerifier) {
        throw new Error('Code verifier not found in session');
      }

      sessionStorage.removeItem('auth_agent_state');
      sessionStorage.removeItem('auth_agent_code_verifier');

      return { code, state, codeVerifier };
    }
  }

  const AuthAgentButton = {
    render: function(config) {
      const {
        elementId,
        authServerUrl,
        clientId,
        redirectUri,
        scope = 'openid profile',
        text = 'Sign in with Auth Agent',
        theme = 'default',
        onSignInStart,
        onError,
      } = config;

      const container = document.getElementById(elementId);
      if (!container) {
        console.error('Element with id "' + elementId + '" not found');
        return;
      }

      const button = document.createElement('button');
      button.className = 'auth-agent-button auth-agent-button-' + theme;
      button.innerHTML = this._getButtonHTML(text, theme);

      this._injectStyles();

      button.addEventListener('click', async () => {
        try {
          if (onSignInStart) onSignInStart();

          const client = new AuthAgentClient({
            authServerUrl,
            clientId,
            redirectUri,
            scope,
          });

          await client.signIn();
        } catch (error) {
          if (onError) onError(error);
          console.error('Auth Agent sign in error:', error);
        }
      });

      container.appendChild(button);
    },

    _getButtonHTML: function(text, theme) {
      const icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/><path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>';

      if (theme === 'minimal') {
        return '<span>' + text + '</span>';
      }

      return icon + '<span>' + text + '</span>';
    },

    _injectStyles: function() {
      if (document.getElementById('auth-agent-button-styles')) {
        return;
      }

      const styles = \`
        .auth-agent-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .auth-agent-button-default {
          color: #fff;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .auth-agent-button-default:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
        }

        .auth-agent-button-default:active {
          transform: translateY(0);
        }

        .auth-agent-button-minimal {
          color: #667eea;
          background: transparent;
          border: 2px solid #667eea;
          padding: 8px 16px;
          font-size: 14px;
        }

        .auth-agent-button-minimal:hover {
          background: #667eea;
          color: #fff;
        }

        .auth-agent-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      \`;

      const styleSheet = document.createElement('style');
      styleSheet.id = 'auth-agent-button-styles';
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    },
  };

  window.AuthAgentClient = AuthAgentClient;
  window.AuthAgentButton = AuthAgentButton;

  console.log('Auth Agent SDK loaded successfully');
})(window);
`.trim();
}
