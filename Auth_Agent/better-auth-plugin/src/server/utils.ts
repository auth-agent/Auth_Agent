/**
 * Generate a cryptographically secure random string
 */
export function generateRandomString(length: number): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map((x) => charset[x % charset.length])
    .join("");
}

/**
 * SHA-256 hash a string and return base64url encoded result
 */
export async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(hash);
}

/**
 * Base64 URL encode a buffer
 */
export function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Decode a JWT token (without verification - verification happens on Auth Agent server)
 */
export function decodeJWT(token: string): any {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  const payload = parts[1];
  if (!payload) {
    throw new Error("Invalid JWT: missing payload");
  }
  const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(decoded);
}

/**
 * Get the redirect URI for OAuth callback
 */
export function getRedirectUri(ctx: any): string {
  const url = new URL(ctx.request.url);
  return `${url.protocol}//${url.host}/api/auth/callback/auth-agent`;
}

/**
 * Get the base URL from context
 */
export function getBaseUrl(ctx: any): string {
  const url = new URL(ctx.request.url);
  return `${url.protocol}//${url.host}`;
}
