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
 * Validate that a redirect URI matches one of the allowed URIs
 */
export function isAllowedRedirectUri(uri: string, allowedUris: string[]): boolean {
  return allowedUris.includes(uri);
}

/**
 * Validate scope string
 */
export function isValidScope(scope: string): boolean {
  // Scope should be a space-separated list of valid scope names
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
  // Agent ID should be alphanumeric with underscores/dashes
  const agentIdRegex = /^[a-zA-Z0-9_-]+$/;
  return agentIdRegex.test(agentId) && agentId.length >= 3;
}

/**
 * Validate client ID format
 */
export function isValidClientId(clientId: string): boolean {
  // Client ID should be alphanumeric with underscores/dashes
  const clientIdRegex = /^[a-zA-Z0-9_-]+$/;
  return clientIdRegex.test(clientId) && clientId.length >= 3;
}
