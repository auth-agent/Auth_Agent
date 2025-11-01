/**
 * Vanilla JavaScript: Sign In with Auth Agent Button
 *
 * Usage:
 * <div id="auth-agent-button"></div>
 *
 * <script src="auth-agent-sdk.js"></script>
 * <script src="auth-agent-button-vanilla.js"></script>
 * <script>
 *   AuthAgentButton.render({
 *     elementId: 'auth-agent-button',
 *     authServerUrl: 'http://localhost:3000',
 *     clientId: 'your_client_id',
 *     redirectUri: 'https://yoursite.com/callback',
 *   });
 * </script>
 */

(function (window) {
  'use strict';

  const AuthAgentButton = {
    /**
     * Render the Auth Agent button
     */
    render: function (config) {
      const {
        elementId,
        authServerUrl,
        clientId,
        redirectUri,
        scope = 'openid profile',
        text = 'Sign in with Auth Agent',
        theme = 'default', // 'default' or 'minimal'
        onSignInStart,
        onError,
      } = config;

      const container = document.getElementById(elementId);
      if (!container) {
        console.error(`Element with id "${elementId}" not found`);
        return;
      }

      // Create button
      const button = document.createElement('button');
      button.className = `auth-agent-button auth-agent-button-${theme}`;
      button.innerHTML = this._getButtonHTML(text, theme);

      // Add styles
      this._injectStyles();

      // Add click handler
      button.addEventListener('click', async () => {
        try {
          if (onSignInStart) onSignInStart();

          // Use the AuthAgentClient from the SDK
          if (!window.AuthAgentClient) {
            throw new Error('AuthAgentClient not found. Please include auth-agent-sdk.js');
          }

          const client = new window.AuthAgentClient({
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

    /**
     * Get button HTML based on theme
     */
    _getButtonHTML: function (text, theme) {
      const icon = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/>
          <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="currentColor"/>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>
      `;

      if (theme === 'minimal') {
        return `<span>${text}</span>`;
      }

      return `${icon}<span>${text}</span>`;
    },

    /**
     * Inject button styles
     */
    _injectStyles: function () {
      if (document.getElementById('auth-agent-button-styles')) {
        return; // Already injected
      }

      const styles = `
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
      `;

      const styleSheet = document.createElement('style');
      styleSheet.id = 'auth-agent-button-styles';
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    },
  };

  // Export to window
  window.AuthAgentButton = AuthAgentButton;
})(window);
