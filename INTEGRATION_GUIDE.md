# Integration Guide for Your Vercel Website

Quick copy-paste guide to add "Sign in with Auth Agent" to your website.

## Step 1: Register Your Website

First, create an OAuth client for your website:

```bash
curl -X POST http://localhost:3000/api/admin/clients \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "My Vercel Website",
    "redirect_uris": [
      "https://your-site.vercel.app/callback",
      "http://localhost:3000/callback"
    ]
  }'
```

**Save the response:**
```json
{
  "client_id": "client_abc123",
  "client_secret": "secret_xyz789",
  "warning": "Save the client_secret securely. It will not be shown again."
}
```

---

## Step 2: Add Environment Variables

In your Vercel project, add these environment variables:

```env
AUTH_AGENT_SERVER_URL=http://localhost:3000
AUTH_AGENT_CLIENT_ID=client_abc123
AUTH_AGENT_CLIENT_SECRET=secret_xyz789
```

---

## Step 3: Add the Sign-In Button

### For Next.js (App Router)

**Create the login page: `app/login/page.tsx`**

```tsx
'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);

    try {
      // Generate PKCE
      const codeVerifier = generateRandomString(128);
      const codeChallenge = await sha256(codeVerifier);

      // Save verifier
      sessionStorage.setItem('code_verifier', codeVerifier);

      // Build auth URL
      const params = new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_AUTH_AGENT_CLIENT_ID!,
        redirect_uri: `${window.location.origin}/callback`,
        response_type: 'code',
        state: generateRandomString(32),
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        scope: 'openid profile',
      });

      // Redirect
      window.location.href = `${process.env.NEXT_PUBLIC_AUTH_AGENT_SERVER_URL}/authorize?${params}`;
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Welcome</h1>

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? 'Redirecting...' : '🤖 Sign in with Auth Agent'}
        </button>
      </div>
    </div>
  );
}

// Helper functions
function generateRandomString(length: number) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map(x => charset[x % charset.length])
    .join('');
}

async function sha256(plain: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hash);
}

function base64UrlEncode(buffer: ArrayBuffer) {
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
```

---

**Create the callback page: `app/callback/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CallbackPage() {
  const [status, setStatus] = useState('Processing authentication...');
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      try {
        // Get code from URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (!code || !state) {
          setStatus('Error: Missing authorization code');
          return;
        }

        // Get code verifier
        const codeVerifier = sessionStorage.getItem('code_verifier');
        if (!codeVerifier) {
          setStatus('Error: Code verifier not found');
          return;
        }

        sessionStorage.removeItem('code_verifier');

        // Exchange code for token
        const response = await fetch('/api/auth/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, codeVerifier }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus('Success! Redirecting to dashboard...');
          setTimeout(() => router.push('/dashboard'), 1000);
        } else {
          setStatus('Error: ' + (data.error || 'Authentication failed'));
        }
      } catch (error) {
        setStatus('Error: ' + (error as Error).message);
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-lg">{status}</p>
      </div>
    </div>
  );
}
```

---

**Create the API route: `app/api/auth/exchange/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { code, codeVerifier } = await request.json();

    // Exchange code for token
    const tokenResponse = await fetch(`${process.env.AUTH_AGENT_SERVER_URL}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        client_id: process.env.AUTH_AGENT_CLIENT_ID,
        client_secret: process.env.AUTH_AGENT_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      return NextResponse.json(
        { success: false, error: error.error_description || 'Token exchange failed' },
        { status: 400 }
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userInfoResponse = await fetch(`${process.env.AUTH_AGENT_SERVER_URL}/introspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: tokens.access_token,
        token_type_hint: 'access_token',
        client_id: process.env.AUTH_AGENT_CLIENT_ID,
        client_secret: process.env.AUTH_AGENT_CLIENT_SECRET,
      }),
    });

    const userInfo = await userInfoResponse.json();

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('session', JSON.stringify({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      agentId: userInfo.sub,
      model: userInfo.model,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Auth exchange error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

**Create the dashboard: `app/dashboard/page.tsx`**

```tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie) {
    redirect('/login');
  }

  const session = JSON.parse(sessionCookie.value);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Agent Information</h2>

          <dl className="space-y-2">
            <div>
              <dt className="font-semibold">Agent ID:</dt>
              <dd className="font-mono text-sm">{session.agentId}</dd>
            </div>

            <div>
              <dt className="font-semibold">Model:</dt>
              <dd>{session.model}</dd>
            </div>

            <div>
              <dt className="font-semibold">Session Expires:</dt>
              <dd>{new Date(session.expiresAt).toLocaleString()}</dd>
            </div>
          </dl>

          <button
            onClick={async () => {
              'use server';
              const cookieStore = await cookies();
              cookieStore.delete('session');
              redirect('/login');
            }}
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 4: Add Environment Variables to Next.js

**Update `next.config.js`:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_AUTH_AGENT_SERVER_URL: process.env.AUTH_AGENT_SERVER_URL,
    NEXT_PUBLIC_AUTH_AGENT_CLIENT_ID: process.env.AUTH_AGENT_CLIENT_ID,
  },
};

module.exports = nextConfig;
```

---

## Step 5: Test Locally

1. Start Auth Agent server: `npm run dev` (in Auth Agent project)
2. Start your Next.js app: `npm run dev`
3. Go to `http://localhost:3000/login`
4. Click "Sign in with Auth Agent"
5. You'll be redirected to the auth server spinning page
6. Simulate agent authentication (in production, AI agent does this)
7. You'll be redirected back to `/callback`
8. Finally redirected to `/dashboard`

---

## Step 6: Deploy to Vercel

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard:
   - `AUTH_AGENT_SERVER_URL` (your deployed auth server URL)
   - `AUTH_AGENT_CLIENT_ID`
   - `AUTH_AGENT_CLIENT_SECRET`
4. Update redirect URIs in Auth Agent to include your Vercel URL
5. Deploy!

---

## Testing with AI Agent

When an AI agent visits your site:

1. Agent navigates to `/login`
2. Agent clicks "Sign in with Auth Agent"
3. Agent detects redirect to auth server
4. Agent extracts `request_id` from spinning page
5. Agent POSTs to `/api/agent/authenticate`:
   ```json
   {
     "request_id": "req_xxx",
     "agent_id": "agent_xxx",
     "agent_secret": "secret_xxx",
     "model": "gpt-4"
   }
   ```
6. Page redirects back to your site
7. Agent is now authenticated!

---

## Quick Links

- Auth Agent server: http://localhost:3000
- Full SDK docs: [sdk/README.md](sdk/README.md)
- API docs: [README.md](README.md#api-endpoints)

**Ready to test with your Vercel site! Let me know the URL and I can help you integrate it!** 🚀
