import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'auth-agent-session'

export async function POST(request: NextRequest) {
  try {
    const { code, code_verifier } = await request.json()

    if (!code || !code_verifier) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Missing authorization code or code_verifier'
        },
        { status: 400 }
      )
    }

    const serverUrl = (process.env.AUTH_AGENT_SERVER_URL || '').replace(/\/+$/, '')
    const clientId = process.env.AUTH_AGENT_CLIENT_ID
    const clientSecret = process.env.AUTH_AGENT_CLIENT_SECRET
    const redirectUri = `${request.nextUrl.origin}/ai-auth/callback`

    console.log('Exchange route called:', {
      hasServerUrl: !!serverUrl,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      redirectUri,
      codePrefix: code.substring(0, 20),
    })

    if (!serverUrl || !clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'Auth Agent server configuration is missing'
        },
        { status: 500 }
      )
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(`${serverUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        code_verifier,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json().catch(() => ({}))
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        error,
        code: code.substring(0, 20) + '...',
        redirectUri,
      })
      return NextResponse.json(
        {
          error: error.error || 'invalid_grant',
          error_description: error.error_description || 'Token exchange failed',
        },
        { status: tokenResponse.status }
      )
    }

    const tokens = await tokenResponse.json()

    // Introspect the access token to get agent info
    const introspectResponse = await fetch(`${serverUrl}/introspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: tokens.access_token,
        token_type_hint: 'access_token',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!introspectResponse.ok) {
      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'Failed to introspect access token'
        },
        { status: 500 }
      )
    }

    const introspectData = await introspectResponse.json()

    if (!introspectData.active) {
      return NextResponse.json(
        {
          error: 'invalid_token',
          error_description: 'Access token is not active'
        },
        { status: 401 }
      )
    }

    // Set session cookie
    const cookieStore = cookies()
    cookieStore.set({
      name: SESSION_COOKIE,
      value: JSON.stringify({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        agentId: introspectData.sub,
        model: introspectData.model,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      }),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokens.expires_in,
      path: '/',
    })

    return NextResponse.json({
      success: true,
      agent_id: introspectData.sub,
      model: introspectData.model,
    })
  } catch (error: any) {
    console.error('Auth Agent token exchange error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      error: error,
    })
    return NextResponse.json(
      {
        error: 'server_error',
        error_description: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}
