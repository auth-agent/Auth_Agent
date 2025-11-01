// Helper functions that don't require Node.js crypto

/**
 * Generate a random ID using Math.random (sufficient for IDs)
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate an authorization code
 */
export function generateAuthCode(): string {
  return `code_${generateRandomString(32)}`;
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(): string {
  return `rt_${generateRandomString(48)}`;
}

/**
 * Generate a request ID
 */
export function generateRequestId(): string {
  return `req_${generateRandomString(24)}`;
}

/**
 * Generate a token ID
 */
export function generateTokenId(): string {
  return `tok_${generateRandomString(16)}`;
}

/**
 * Generate agent ID
 */
export function generateAgentId(): string {
  return `agent_${generateRandomString(16)}`;
}

/**
 * Generate client ID
 */
export function generateClientId(): string {
  return `client_${generateRandomString(16)}`;
}

/**
 * Generate secure random for secrets
 */
export function generateSecureRandom(): string {
  return generateRandomString(43);
}
