/**
 * Auth Agent Client SDK
 *
 * Handles OAuth 2.1 flow for websites integrating with Auth Agent
 * Features:
 * - Automatic PKCE generation
 * - State management
 * - Redirect handling
 */

export interface AuthAgentConfig {
  authServerUrl: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
}

export interface AuthorizationParams {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
}

export class AuthAgentClient {
  private config: AuthAgentConfig;

  constructor(config: AuthAgentConfig) {
    this.config = {
      scope: 'openid profile',
      ...config,
    };
  }

  /**
   * Generate a random string for PKCE verifier and state
   */
  private generateRandomString(length: number = 43): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    return Array.from(randomValues)
      .map(x => charset[x % charset.length])
      .join('');
  }

  /**
   * Generate SHA-256 hash and base64url encode
   */
  private async sha256(plain: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);

    // Convert to base64url
    return this.base64UrlEncode(hash);
  }

  /**
   * Base64URL encode
   */
  private base64UrlEncode(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  private async generatePKCE(): Promise<{ verifier: string; challenge: string }> {
    const verifier = this.generateRandomString(128);
    const challenge = await this.sha256(verifier);

    return { verifier, challenge };
  }

  /**
   * Initiate OAuth authorization flow
   * Redirects user to Auth Agent authorization server
   */
  async signIn(): Promise<void> {
    // Generate PKCE
    const { verifier, challenge } = await this.generatePKCE();

    // Generate state
    const state = this.generateRandomString(32);

    // Store verifier and state in session storage
    sessionStorage.setItem('auth_agent_code_verifier', verifier);
    sessionStorage.setItem('auth_agent_state', state);

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      state: state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      scope: this.config.scope!,
    });

    const authUrl = `${this.config.authServerUrl}/authorize?${params.toString()}`;

    // Redirect to auth server
    window.location.href = authUrl;
  }

  /**
   * Handle callback after OAuth redirect
   * Call this on your callback page
   *
   * @returns Authorization code and state, or null if invalid
   */
  handleCallback(): { code: string; state: string; codeVerifier: string } | null {
    // Parse URL params
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code || !state) {
      return null;
    }

    // Retrieve stored state and verifier
    const storedState = sessionStorage.getItem('auth_agent_state');
    const codeVerifier = sessionStorage.getItem('auth_agent_code_verifier');

    // Verify state matches (CSRF protection)
    if (state !== storedState) {
      throw new Error('State mismatch - possible CSRF attack');
    }

    if (!codeVerifier) {
      throw new Error('Code verifier not found in session');
    }

    // Clean up session storage
    sessionStorage.removeItem('auth_agent_state');
    sessionStorage.removeItem('auth_agent_code_verifier');

    return { code, state, codeVerifier };
  }

  /**
   * Exchange authorization code for access token
   * This should be called from your backend for security
   *
   * For demo purposes, this can be called from frontend,
   * but in production, always exchange tokens on the backend
   */
  async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    clientSecret: string
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
  }> {
    const response = await fetch(`${this.config.authServerUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        code_verifier: codeVerifier,
        client_id: this.config.clientId,
        client_secret: clientSecret,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  /**
   * Get authorization parameters for manual handling
   */
  async getAuthorizationParams(): Promise<AuthorizationParams> {
    const { verifier, challenge } = await this.generatePKCE();
    const state = this.generateRandomString(32);

    return {
      state,
      codeVerifier: verifier,
      codeChallenge: challenge,
    };
  }

  /**
   * Build authorization URL manually
   */
  buildAuthorizationUrl(params: AuthorizationParams): string {
    const urlParams = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      state: params.state,
      code_challenge: params.codeChallenge,
      code_challenge_method: 'S256',
      scope: this.config.scope!,
    });

    return `${this.config.authServerUrl}/authorize?${urlParams.toString()}`;
  }
}

/**
 * Create a singleton instance for easy usage
 */
export function createAuthAgentClient(config: AuthAgentConfig): AuthAgentClient {
  return new AuthAgentClient(config);
}
