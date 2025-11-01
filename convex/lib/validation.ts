// Input validation utilities

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that URL uses HTTPS (required for OAuth 2.1)
 * Allows HTTP only for localhost (development)
 */
export function requiresHttps(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Allow HTTP only for localhost/127.0.0.1 (development)
    if (parsed.protocol === 'http:') {
      const hostname = parsed.hostname.toLowerCase();
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    }
    // Require HTTPS for all other URLs
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate that a redirect URI matches one of the allowed URIs
 */
export function isAllowedRedirectUri(uri: string, allowedUris: string[]): boolean {
  return allowedUris.includes(uri);
}

/**
 * Validate redirect URI with HTTPS requirement
 */
export function isValidRedirectUri(uri: string): boolean {
  if (!isValidUrl(uri)) {
    return false;
  }
  // OAuth 2.1 requires HTTPS (except localhost for development)
  return requiresHttps(uri);
}

/**
 * Validate scope string
 */
export function isValidScope(scope: string): boolean {
  const scopeRegex = /^[a-z0-9_]+( [a-z0-9_]+)*$/;
  return scopeRegex.test(scope);
}

/**
 * Validate grant type
 */
export function isValidGrantType(grantType: string, allowedGrantTypes: string[]): boolean {
  return allowedGrantTypes.includes(grantType);
}

/**
 * Validate code challenge method
 */
export function isValidCodeChallengeMethod(method: string): boolean {
  return method === 'S256';
}

/**
 * Validate agent ID format
 */
export function isValidAgentId(agentId: string): boolean {
  const agentIdRegex = /^[a-zA-Z0-9_-]+$/;
  return agentIdRegex.test(agentId) && agentId.length >= 3;
}

/**
 * Validate client ID format
 */
export function isValidClientId(clientId: string): boolean {
  const clientIdRegex = /^[a-zA-Z0-9_-]+$/;
  return clientIdRegex.test(clientId) && clientId.length >= 3;
}
