"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { webcrypto } from "crypto";

const crypto = webcrypto as unknown as Crypto;

/**
 * Hash a secret (action for Node.js runtime)
 */
export const hashSecretAction = action({
  args: { secret: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(args.secret);

    const salt = crypto.getRandomValues(new Uint8Array(16));

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      data,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const hashArray = new Uint8Array(derivedBits);
    const combined = new Uint8Array(salt.length + hashArray.length);
    combined.set(salt);
    combined.set(hashArray, salt.length);

    return Buffer.from(combined).toString('base64');
  },
});

/**
 * Verify a secret (action for Node.js runtime)
 */
export const verifySecretAction = action({
  args: { secret: v.string(), hash: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(args.secret);

      const combined = Buffer.from(args.hash, 'base64');
      const salt = combined.slice(0, 16);
      const storedHash = combined.slice(16);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        data,
        'PBKDF2',
        false,
        ['deriveBits']
      );

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );

      const hashArray = new Uint8Array(derivedBits);

      if (hashArray.length !== storedHash.length) return false;

      let result = 0;
      for (let i = 0; i < hashArray.length; i++) {
        result |= hashArray[i] ^ storedHash[i];
      }

      return result === 0;
    } catch {
      return false;
    }
  },
});

/**
 * Validate PKCE (action for Node.js runtime)
 */
export const validatePKCEAction = action({
  args: {
    codeVerifier: v.string(),
    codeChallenge: v.string(),
    method: v.string(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    if (args.method !== 'S256') {
      return false;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(args.codeVerifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    const base64 = Buffer.from(hashArray).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return base64 === args.codeChallenge;
  },
});

/**
 * Generate JWT (action for Node.js runtime)
 */
export const generateJWTAction = action({
  args: {
    agentId: v.string(),
    clientId: v.string(),
    model: v.string(),
    scope: v.string(),
    expiresIn: v.number(),
    issuer: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const now = Math.floor(Date.now() / 1000);

    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: args.agentId,
      client_id: args.clientId,
      model: args.model,
      scope: args.scope,
      iat: now,
      exp: now + args.expiresIn,
      iss: args.issuer,
    };

    const base64UrlEncode = (input: string | Uint8Array): string => {
      const base64 = typeof input === 'string'
        ? Buffer.from(input).toString('base64')
        : Buffer.from(input).toString('base64');

      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));

    const message = `${encodedHeader}.${encodedPayload}`;
    const encoder = new TextEncoder();
    const messageData = encoder.encode(message);
    const secretData = encoder.encode(args.secret);

    const key = await crypto.subtle.importKey(
      'raw',
      secretData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const encodedSignature = base64UrlEncode(new Uint8Array(signature));

    return `${message}.${encodedSignature}`;
  },
});

/**
 * Verify JWT (action for Node.js runtime)
 */
export const verifyJWTAction = action({
  args: {
    token: v.string(),
    secret: v.string(),
    issuer: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      const parts = args.token.split('.');
      if (parts.length !== 3) return null;

      const [encodedHeader, encodedPayload, encodedSignature] = parts;

      const message = `${encodedHeader}.${encodedPayload}`;
      const encoder = new TextEncoder();
      const messageData = encoder.encode(message);
      const secretData = encoder.encode(args.secret);

      const key = await crypto.subtle.importKey(
        'raw',
        secretData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );

      const signatureBuffer = Buffer.from(
        encodedSignature.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      );

      const isValid = await crypto.subtle.verify(
        'HMAC',
        key,
        signatureBuffer,
        messageData
      );

      if (!isValid) return null;

      const payloadJson = Buffer.from(
        encodedPayload.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString();

      const payload = JSON.parse(payloadJson);

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) return null;
      if (payload.iss !== args.issuer) return null;

      return payload;
    } catch {
      return null;
    }
  },
});

/**
 * Generate secure random string (action for Node.js runtime)
 */
export const generateSecureRandomAction = action({
  args: { bytes: v.number() },
  handler: async (ctx, args): Promise<string> => {
    const randomBytes = crypto.getRandomValues(new Uint8Array(args.bytes));
    return Buffer.from(randomBytes).toString('base64url');
  },
});
