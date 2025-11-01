// OAuth 2.1 Discovery endpoints

import type { Context } from 'hono';
import { CONFIG } from '../lib/constants.js';

/**
 * GET /.well-known/oauth-authorization-server
 *
 * OAuth 2.0 Authorization Server Metadata (RFC 8414)
 */
export function discoveryHandler(c: Context) {
  const baseUrl = CONFIG.BASE_URL;

  return c.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    introspection_endpoint: `${baseUrl}/introspect`,
    revocation_endpoint: `${baseUrl}/revoke`,
    jwks_uri: `${baseUrl}/.well-known/jwks.json`,

    // Supported features
    response_types_supported: ['code'],
    grant_types_supported: CONFIG.SUPPORTED_GRANT_TYPES,
    code_challenge_methods_supported: CONFIG.SUPPORTED_CODE_CHALLENGE_METHODS,

    // Token endpoint auth methods
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    introspection_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    revocation_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],

    // Scopes
    scopes_supported: ['openid', 'profile', 'email'],

    // Token types
    token_endpoint_auth_signing_alg_values_supported: ['HS256'],

    // Service documentation
    service_documentation: 'https://auth-agent.com/docs',

    // UI locales (future)
    ui_locales_supported: ['en'],
  });
}

/**
 * GET /.well-known/jwks.json
 *
 * JSON Web Key Set for JWT verification
 * For now returns empty set (we use symmetric HS256)
 */
export function jwksHandler(c: Context) {
  // For symmetric keys (HS256), we don't expose the secret
  // Public key infrastructure (RS256) would expose keys here
  return c.json({
    keys: [],
  });
}
