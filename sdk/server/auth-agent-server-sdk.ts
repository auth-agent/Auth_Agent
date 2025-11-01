/**
 * Auth Agent Server SDK (Node.js/TypeScript)
 *
 * Backend SDK for securely exchanging tokens and validating them
 */

export interface AuthAgentServerConfig {
  authServerUrl: string;
  clientId: string;
  clientSecret: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface IntrospectionResponse {
  active: boolean;
  scope?: string;
  client_id?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  sub?: string;
  iss?: string;
  model?: string;
}

export class AuthAgentServerSDK {
  private config: AuthAgentServerConfig;

  constructor(config: AuthAgentServerConfig) {
    this.config = config;
  }

  /**
   * Exchange authorization code for access token
   *
   * @param code - Authorization code from callback
   * @param codeVerifier - PKCE code verifier
   * @param redirectUri - Must match the one used in authorization
   */
  async exchangeCode(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<TokenResponse> {
    const response = await fetch(`${this.config.authServerUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Token exchange failed: ${error.error_description || error.error}`
      );
    }

    return response.json();
  }

  /**
   * Refresh an access token using a refresh token
   *
   * @param refreshToken - Refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch(`${this.config.authServerUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Token refresh failed: ${error.error_description || error.error}`
      );
    }

    return response.json();
  }

  /**
   * Introspect a token to validate it and get metadata
   *
   * @param token - Access token or refresh token
   * @param tokenTypeHint - Optional hint: 'access_token' or 'refresh_token'
   */
  async introspectToken(
    token: string,
    tokenTypeHint?: 'access_token' | 'refresh_token'
  ): Promise<IntrospectionResponse> {
    const response = await fetch(`${this.config.authServerUrl}/introspect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        token_type_hint: tokenTypeHint,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Token introspection failed: ${error.error_description || error.error}`
      );
    }

    return response.json();
  }

  /**
   * Revoke a token (access token or refresh token)
   *
   * @param token - Token to revoke
   * @param tokenTypeHint - Optional hint: 'access_token' or 'refresh_token'
   */
  async revokeToken(
    token: string,
    tokenTypeHint?: 'access_token' | 'refresh_token'
  ): Promise<void> {
    const response = await fetch(`${this.config.authServerUrl}/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        token_type_hint: tokenTypeHint,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Token revocation failed: ${error.error_description || error.error}`
      );
    }
  }

  /**
   * Validate an access token
   * Returns true if token is active and valid
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const result = await this.introspectToken(accessToken, 'access_token');
      return result.active === true;
    } catch {
      return false;
    }
  }

  /**
   * Get user information from access token
   * Returns the decoded token payload
   */
  async getUserInfo(accessToken: string): Promise<IntrospectionResponse | null> {
    const result = await this.introspectToken(accessToken, 'access_token');

    if (!result.active) {
      return null;
    }

    return result;
  }

  /**
   * Middleware helper for Express.js
   * Validates access token from Authorization header
   */
  createAuthMiddleware() {
    return async (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'unauthorized',
          error_description: 'Missing or invalid authorization header',
        });
      }

      const token = authHeader.substring(7);

      try {
        const userInfo = await this.getUserInfo(token);

        if (!userInfo) {
          return res.status(401).json({
            error: 'unauthorized',
            error_description: 'Invalid or expired token',
          });
        }

        // Attach user info to request
        req.user = userInfo;
        next();
      } catch (error) {
        return res.status(401).json({
          error: 'unauthorized',
          error_description: 'Token validation failed',
        });
      }
    };
  }
}

/**
 * Create SDK instance
 */
export function createAuthAgentServerSDK(
  config: AuthAgentServerConfig
): AuthAgentServerSDK {
  return new AuthAgentServerSDK(config);
}
