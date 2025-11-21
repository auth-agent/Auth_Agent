# auth-agent-sdk

Official SDK for [Auth Agent](https://auth-agent.com) - OAuth 2.1 authentication for AI agents and websites.

[![npm version](https://badge.fury.io/js/auth-agent-sdk.svg)](https://www.npmjs.com/package/auth-agent-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install auth-agent-sdk
# or
yarn add auth-agent-sdk
# or
pnpm add auth-agent-sdk
```

## What's Included

This package includes SDKs for **both use cases**:

### For Websites
Add "Sign in with Auth Agent" to your website:
- 🎨 **React components** - Pre-built Auth Agent button
- 🌐 **Vanilla JavaScript** - Framework-agnostic client SDK
- 🔐 **OAuth 2.1 with PKCE** - Secure authorization flow

### For AI Agents
Enable your AI agents to authenticate programmatically:
- 🤖 **Agent SDK** - Authenticate on websites with Auth Agent
- 📡 **Back-channel authentication** - No human interaction needed
- ✅ **TypeScript support** - Full type safety

---

## Quick Start

### For Websites (React/Next.js)

#### 1. Add the Auth Agent Button

```tsx
import { AuthAgentButton } from 'auth-agent-sdk/client/react';

export default function LoginPage() {
  return (
    <AuthAgentButton
      clientId="your_client_id"
      redirectUri="https://yoursite.com/callback"
      onSignInStart={() => {
        console.log('Starting authentication...');
      }}
      onError={(error) => {
        console.error('Auth failed:', error);
      }}
    />
  );
}
```

#### 2. Handle the Callback

```tsx
'use client';

import { useEffect } from 'react';
import { AuthAgentClient } from 'auth-agent-sdk/client';

export default function CallbackPage() {
  useEffect(() => {
    const client = new AuthAgentClient({
      clientId: 'your_client_id',
      clientSecret: 'your_client_secret', // Server-side only!
    });

    const result = client.handleCallback();
    if (result) {
      // Exchange code for tokens (do this on your backend!)
      fetch('/api/auth/exchange', {
        method: 'POST',
        body: JSON.stringify({ code: result.code, codeVerifier: result.codeVerifier }),
      });
    }
  }, []);

  return <div>Authenticating...</div>;
}
```

---

### For AI Agents (TypeScript)

```typescript
import { AuthAgentSDK } from 'auth-agent-sdk/agent';

const sdk = new AuthAgentSDK({
  agentId: process.env.AGENT_ID!,
  agentSecret: process.env.AGENT_SECRET!,
  model: 'gpt-4',
});

// When your agent encounters an Auth Agent login page
const authorizationUrl = 'https://api.auth-agent.com/authorize?...';

// Automatically authenticate
const result = await sdk.completeAuthenticationFlow(authorizationUrl);

console.log('Authorization code:', result.code);
// Use this code to complete the OAuth flow
```

---

## API Reference

### For Websites

#### `AuthAgentClient`

Client-side SDK for OAuth flow.

```typescript
import { AuthAgentClient } from 'auth-agent-sdk/client';

const client = new AuthAgentClient({
  clientId: 'your_client_id',
  redirectUri: 'https://yoursite.com/callback',
  authServerUrl: 'https://api.auth-agent.com', // optional
});

// Start OAuth flow (redirects user)
client.signIn();

// Handle callback (call this on your callback page)
const result = client.handleCallback();
// Returns: { code: string, state: string, codeVerifier: string } | null
```

#### `AuthAgentButton` (React)

Pre-built React component.

```typescript
import { AuthAgentButton } from 'auth-agent-sdk/client/react';

<AuthAgentButton
  clientId="your_client_id"
  redirectUri="https://yoursite.com/callback"
  authServerUrl="https://api.auth-agent.com" // optional
  text="Sign in with Auth Agent" // optional
  className="custom-class" // optional
  onSignInStart={() => console.log('Starting...')}
  onError={(error) => console.error('Error:', error)}
/>
```

**Props:**
- `clientId` - Your OAuth client ID (**required**)
- `redirectUri` - Callback URL (**required**)
- `authServerUrl` - Auth Agent server URL (default: `https://api.auth-agent.com`)
- `text` - Button text (default: "Sign in with Auth Agent")
- `className` - Custom CSS class
- `scope` - Optional OAuth scope (default: "openid profile")
- `onSignInStart` - Called when sign-in starts (before redirect)
- `onError` - Called on error during sign-in

**Note:** The Auth Agent logo is always displayed for branding compliance. It cannot be hidden or replaced.

---

### For AI Agents

#### `AuthAgentSDK`

SDK for AI agents to authenticate programmatically.

```typescript
import { AuthAgentSDK } from 'auth-agent-sdk/agent';

const sdk = new AuthAgentSDK({
  agentId: 'agent_xxx',
  agentSecret: 'ags_xxx',
  model: 'gpt-4', // or 'claude-3.5-sonnet', etc.
  authServerUrl: 'https://api.auth-agent.com', // optional
});
```

**Methods:**

##### `extractRequestId(authorizationUrl: string): Promise<string>`

Extract the request ID from an authorization page.

```typescript
const requestId = await sdk.extractRequestId(authorizationUrl);
```

##### `authenticate(requestId: string, authorizationUrl: string): Promise<void>`

Authenticate with the Auth Agent server.

```typescript
await sdk.authenticate(requestId, authorizationUrl);
```

##### `checkStatus(requestId: string, authorizationUrl: string): Promise<AuthStatus>`

Check authentication status.

```typescript
const status = await sdk.checkStatus(requestId, authorizationUrl);
// Returns: { status: 'authenticated' | 'pending', code?: string, state?: string }
```

##### `completeAuthenticationFlow(authorizationUrl: string): Promise<AuthResult>`

Complete the entire flow (extract → authenticate → poll).

```typescript
const result = await sdk.completeAuthenticationFlow(authorizationUrl);
// Returns: { code: string, state: string, redirect_uri: string }
```

---

## Environment Variables

```env
# For websites
NEXT_PUBLIC_AUTH_AGENT_CLIENT_ID=your_client_id
AUTH_AGENT_CLIENT_SECRET=your_client_secret
AUTH_AGENT_REDIRECT_URI=https://yoursite.com/callback

# For agents
AGENT_ID=agent_xxx
AGENT_SECRET=ags_xxx
AGENT_MODEL=gpt-4
```

---

## Examples

### Next.js App Router Example

```typescript
// app/login/page.tsx
import { AuthAgentButton } from 'auth-agent-sdk/client/react';

export default function LoginPage() {
  return (
    <div>
      <h1>Welcome</h1>
      <AuthAgentButton
        clientId={process.env.NEXT_PUBLIC_AUTH_AGENT_CLIENT_ID!}
        redirectUri={`${process.env.NEXT_PUBLIC_URL}/auth/callback`}
      />
    </div>
  );
}
```

```typescript
// app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthAgentClient } from 'auth-agent-sdk/client';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      const client = new AuthAgentClient({
        clientId: process.env.NEXT_PUBLIC_AUTH_AGENT_CLIENT_ID!,
        redirectUri: `${window.location.origin}/auth/callback`,
      });

      const result = client.handleCallback();
      if (!result) return;

      // Exchange code on backend
      const response = await fetch('/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: result.code,
          codeVerifier: result.codeVerifier,
        }),
      });

      if (response.ok) {
        router.push('/dashboard');
      }
    }

    handleCallback();
  }, [router]);

  return <div>Processing authentication...</div>;
}
```

```typescript
// app/api/auth/exchange/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { code, codeVerifier } = await request.json();

  // Exchange code for tokens
  const response = await fetch('https://api.auth-agent.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      client_id: process.env.AUTH_AGENT_CLIENT_ID,
      client_secret: process.env.AUTH_AGENT_CLIENT_SECRET,
      redirect_uri: `${process.env.NEXT_PUBLIC_URL}/auth/callback`,
    }),
  });

  const tokens = await response.json();

  // Store tokens in session/database
  // ... your session management logic

  return NextResponse.json({ success: true });
}
```

### AI Agent Example (TypeScript)

```typescript
import { AuthAgentSDK } from 'auth-agent-sdk/agent';

async function authenticateAgent() {
  const sdk = new AuthAgentSDK({
    agentId: process.env.AGENT_ID!,
    agentSecret: process.env.AGENT_SECRET!,
    model: 'gpt-4',
  });

  // Your agent navigates to a website that uses Auth Agent
  const authorizationUrl = 'https://example.com/login?...';

  try {
    const result = await sdk.completeAuthenticationFlow(authorizationUrl);

    console.log('Authenticated successfully!');
    console.log('Authorization code:', result.code);

    // The website will redirect with this code
    // and exchange it for access tokens
  } catch (error) {
    console.error('Authentication failed:', error);
  }
}
```

---

## Security Best Practices

### For Websites

✅ **DO:**
- Store `client_secret` server-side only
- Use HTTPS in production
- Validate `state` parameter to prevent CSRF
- Implement PKCE (handled automatically by SDK)
- Store tokens securely (HTTPOnly cookies recommended)

❌ **DON'T:**
- Expose `client_secret` to the frontend
- Store access tokens in localStorage (vulnerable to XSS)
- Skip PKCE validation
- Use HTTP in production

### For Agents

✅ **DO:**
- Store credentials in environment variables
- Never log `agent_secret`
- Use HTTPS for all API calls
- Verify SSL certificates

❌ **DON'T:**
- Hardcode credentials in code
- Commit `.env` files to version control
- Disable SSL verification

---

## TypeScript Support

This package is written in TypeScript and includes full type definitions.

```typescript
import type {
  AuthAgentClient,
  AuthAgentSDK,
  AuthResult,
  AuthStatus,
  OAuthTokens,
} from 'auth-agent-sdk';
```

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Modern mobile browsers

---

## Getting Credentials

To use Auth Agent, you need to register:

1. **For Websites**: Register an OAuth client
2. **For Agents**: Register an agent

**Coming Soon:** Visit [console.auth-agent.com](https://console.auth-agent.com) to self-register!

For now, please contact us or see the [documentation](https://docs.auth-agent.com).

---

## Documentation

- [Full Documentation](https://docs.auth-agent.com)
- [Integration Guides](https://docs.auth-agent.com/guides/integration-scenarios)
- [API Reference](https://docs.auth-agent.com/api-reference)
- [Security Guide](https://docs.auth-agent.com/guides/security)

---

## Support

- **Issues**: [GitHub Issues](https://github.com/auth-agent/auth-agent/issues)
- **Documentation**: [docs.auth-agent.com](https://docs.auth-agent.com)
- **Community**: [Discord](https://discord.gg/auth-agent)

---

## License

MIT © Auth Agent Team

---

## Related Packages

- **Python SDK**: [`pip install auth-agent-sdk`](https://pypi.org/project/auth-agent-sdk/)
- **Browser-use Integration**: See Python SDK for browser automation example

---

## Changelog

### 1.0.0 (2025-01-07)

- Initial release
- Website SDK with React components
- Agent SDK for programmatic authentication
- Full TypeScript support
- PKCE implementation
- OAuth 2.1 compliant
