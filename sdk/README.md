# Auth Agent SDK

Complete integration SDKs for Auth Agent OAuth 2.1 authentication.

## Installation

### Client-Side SDK (Browser)

**Copy these files to your project:**
- `sdk/client/auth-agent-sdk.ts` - Core SDK
- `sdk/client/AuthAgentButton.tsx` - React component
- `sdk/client/auth-agent-button-vanilla.js` - Vanilla JS component

### Server-Side SDK (Node.js/TypeScript)

**Copy this file to your project:**
- `sdk/server/auth-agent-server-sdk.ts`

---

## Quick Start

### 1. React/Next.js Integration

**Install the button component:**

```tsx
// components/AuthAgentButton.tsx
import { AuthAgentButton } from '@/sdk/client/AuthAgentButton';

export default function LoginPage() {
  return (
    <div>
      <h1>Welcome</h1>

      <AuthAgentButton
        authServerUrl="http://localhost:3000"
        clientId="your_client_id"
        redirectUri="https://yoursite.com/callback"
        onSignInStart={() => console.log('Sign in started')}
        onError={(error) => console.error('Error:', error)}
      />
    </div>
  );
}
```

**Handle the callback:**

```tsx
// pages/callback.tsx (Next.js)
// or app/callback/page.tsx (Next.js App Router)

'use client'; // if using App Router

import { useEffect, useState } from 'react';
import { createAuthAgentClient } from '@/sdk/client/auth-agent-sdk';

export default function CallbackPage() {
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    async function handleCallback() {
      const client = createAuthAgentClient({
        authServerUrl: 'http://localhost:3000',
        clientId: 'your_client_id',
        redirectUri: 'https://yoursite.com/callback',
      });

      try {
        // Handle callback
        const result = client.handleCallback();

        if (!result) {
          setStatus('Error: Invalid callback');
          return;
        }

        // Send to your backend to exchange for token
        const response = await fetch('/api/auth/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: result.code,
            codeVerifier: result.codeVerifier,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Redirect to dashboard
          window.location.href = '/dashboard';
        } else {
          setStatus('Error: ' + data.error);
        }
      } catch (error) {
        setStatus('Error: ' + error.message);
      }
    }

    handleCallback();
  }, []);

  return <div>{status}</div>;
}
```

**Backend token exchange (Next.js API route):**

```typescript
// pages/api/auth/exchange.ts (Pages Router)
// or app/api/auth/exchange/route.ts (App Router)

import { NextApiRequest, NextApiResponse } from 'next';
import { createAuthAgentServerSDK } from '@/sdk/server/auth-agent-server-sdk';

const authSDK = createAuthAgentServerSDK({
  authServerUrl: 'http://localhost:3000',
  clientId: process.env.AUTH_AGENT_CLIENT_ID!,
  clientSecret: process.env.AUTH_AGENT_CLIENT_SECRET!,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, codeVerifier } = req.body;

  try {
    // Exchange code for token
    const tokens = await authSDK.exchangeCode(
      code,
      codeVerifier,
      process.env.AUTH_AGENT_REDIRECT_URI!
    );

    // Get user info
    const userInfo = await authSDK.getUserInfo(tokens.access_token);

    // Create session (use your preferred session management)
    // For example with iron-session, next-auth, etc.
    req.session.set('user', {
      agentId: userInfo?.sub,
      model: userInfo?.model,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
    await req.session.save();

    return res.json({ success: true });
  } catch (error) {
    console.error('Token exchange error:', error);
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}
```

---

### 2. Vanilla JavaScript/HTML Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>Login with Auth Agent</title>
</head>
<body>
  <h1>Welcome</h1>

  <!-- Button will be rendered here -->
  <div id="auth-agent-button"></div>

  <!-- Include SDK -->
  <script src="/sdk/client/auth-agent-sdk.js"></script>
  <script src="/sdk/client/auth-agent-button-vanilla.js"></script>

  <script>
    // Render button
    AuthAgentButton.render({
      elementId: 'auth-agent-button',
      authServerUrl: 'http://localhost:3000',
      clientId: 'your_client_id',
      redirectUri: 'https://yoursite.com/callback.html',
      text: 'Sign in with Auth Agent',
      theme: 'default', // or 'minimal'
      onSignInStart: () => console.log('Starting sign in...'),
      onError: (error) => console.error('Error:', error)
    });
  </script>
</body>
</html>
```

**Callback page:**

```html
<!-- callback.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Processing...</title>
</head>
<body>
  <p>Processing authentication...</p>

  <script src="/sdk/client/auth-agent-sdk.js"></script>
  <script>
    const client = new AuthAgentClient({
      authServerUrl: 'http://localhost:3000',
      clientId: 'your_client_id',
      redirectUri: 'https://yoursite.com/callback.html',
    });

    // Handle callback
    const result = client.handleCallback();

    if (result) {
      // Send to backend
      fetch('/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: result.code,
          codeVerifier: result.codeVerifier,
        }),
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          window.location.href = '/dashboard.html';
        } else {
          alert('Authentication failed: ' + data.error);
        }
      })
      .catch(error => {
        alert('Error: ' + error.message);
      });
    } else {
      alert('Invalid callback');
    }
  </script>
</body>
</html>
```

---

### 3. Express.js Backend Integration

```typescript
import express from 'express';
import { createAuthAgentServerSDK } from './sdk/server/auth-agent-server-sdk';

const app = express();
app.use(express.json());

const authSDK = createAuthAgentServerSDK({
  authServerUrl: 'http://localhost:3000',
  clientId: process.env.AUTH_AGENT_CLIENT_ID!,
  clientSecret: process.env.AUTH_AGENT_CLIENT_SECRET!,
});

// Token exchange endpoint
app.post('/api/auth/exchange', async (req, res) => {
  const { code, codeVerifier } = req.body;

  try {
    const tokens = await authSDK.exchangeCode(
      code,
      codeVerifier,
      process.env.AUTH_AGENT_REDIRECT_URI!
    );

    // Store tokens in session
    req.session.accessToken = tokens.access_token;
    req.session.refreshToken = tokens.refresh_token;

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Protected route example
app.get('/api/user/profile', authSDK.createAuthMiddleware(), (req, res) => {
  // req.user is populated by the middleware
  res.json({
    agentId: req.user.sub,
    model: req.user.model,
    scope: req.user.scope,
  });
});

// Refresh token endpoint
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const tokens = await authSDK.refreshToken(refreshToken);

    req.session.accessToken = tokens.access_token;

    res.json({ success: true, accessToken: tokens.access_token });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Logout endpoint
app.post('/api/auth/logout', async (req, res) => {
  const { accessToken } = req.session;

  try {
    await authSDK.revokeToken(accessToken, 'access_token');
    req.session.destroy();
    res.json({ success: true });
  } catch (error) {
    res.json({ success: true }); // Always succeed logout
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

## Environment Variables

Create a `.env` file in your project:

```env
# Auth Agent Configuration
AUTH_AGENT_SERVER_URL=http://localhost:3000
AUTH_AGENT_CLIENT_ID=your_client_id
AUTH_AGENT_CLIENT_SECRET=your_client_secret
AUTH_AGENT_REDIRECT_URI=https://yoursite.com/callback
```

---

## API Reference

### Client SDK

#### `createAuthAgentClient(config)`

Create a new Auth Agent client instance.

**Parameters:**
- `authServerUrl` - URL of Auth Agent server
- `clientId` - Your OAuth client ID
- `redirectUri` - Your callback URL
- `scope` - Optional scopes (default: "openid profile")

**Methods:**
- `signIn()` - Start OAuth flow (redirects)
- `handleCallback()` - Process callback, returns `{ code, state, codeVerifier }`
- `exchangeCodeForToken(code, codeVerifier, clientSecret)` - Exchange code (should be done on backend)

### Server SDK

#### `createAuthAgentServerSDK(config)`

Create a new server SDK instance.

**Parameters:**
- `authServerUrl` - URL of Auth Agent server
- `clientId` - Your OAuth client ID
- `clientSecret` - Your OAuth client secret

**Methods:**
- `exchangeCode(code, codeVerifier, redirectUri)` - Exchange authorization code
- `refreshToken(refreshToken)` - Refresh access token
- `introspectToken(token, tokenTypeHint?)` - Validate token
- `revokeToken(token, tokenTypeHint?)` - Revoke token
- `validateToken(accessToken)` - Check if token is valid
- `getUserInfo(accessToken)` - Get user info from token
- `createAuthMiddleware()` - Express middleware for protecting routes

---

## Button Customization

### React Button Themes

```tsx
// Default theme (gradient)
<AuthAgentButton {...config} />

// Minimal theme (outline)
<AuthAgentButtonMinimal {...config} />

// Custom styling
<AuthAgentButton
  {...config}
  style={{
    background: 'black',
    color: 'white',
    borderRadius: '4px',
  }}
>
  Custom Text
</AuthAgentButton>
```

### Vanilla JS Button Themes

```javascript
AuthAgentButton.render({
  ...config,
  theme: 'default', // or 'minimal'
  text: 'Custom Button Text',
});
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Use HTTPS everywhere (both auth server and your website)
- [ ] Store `client_secret` securely (environment variables, secret manager)
- [ ] Never expose `client_secret` to the frontend
- [ ] Register production redirect URIs in Auth Agent
- [ ] Implement proper session management
- [ ] Add CORS configuration if needed
- [ ] Set up token refresh logic
- [ ] Implement logout functionality
- [ ] Test the full flow end-to-end

---

## Troubleshooting

### "State mismatch" error
- Cookies are blocked or cleared during redirect
- Check browser privacy settings

### "Redirect URI mismatch"
- Ensure redirect URI is registered in Auth Agent
- URI must match exactly (including trailing slash)

### "Invalid client"
- Check client_id and client_secret
- Ensure credentials are correct

### Token exchange fails
- Verify you're using the correct code_verifier
- Code can only be used once
- Code expires after 10 minutes

---

## Next Steps

1. Register your client: See [Admin API docs](../README.md#admin-endpoints)
2. Deploy Auth Agent server
3. Configure your environment variables
4. Test with AI agents!
