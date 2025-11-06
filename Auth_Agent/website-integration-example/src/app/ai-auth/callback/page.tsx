'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createAuthAgentClient } from '@/lib/auth-agent-sdk'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Processing authentication…')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Check for OAuth error in URL params
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (errorParam) {
          setError(errorDescription || errorParam)
          setStatus('Authentication failed')
          return
        }

        setStatus('Validating authorization code…')

        // Use SDK to handle callback
        const client = createAuthAgentClient({
          authServerUrl: process.env.NEXT_PUBLIC_AUTH_AGENT_SERVER_URL!,
          clientId: process.env.NEXT_PUBLIC_AUTH_AGENT_CLIENT_ID!,
          redirectUri: `${window.location.origin}/ai-auth/callback`,
        })

        const result = client.handleCallback()

        if (!result) {
          setError('Missing authorization code or state parameter')
          setStatus('Authentication failed')
          return
        }

        const { code, codeVerifier } = result

        setStatus('Exchanging code for tokens…')

        // Exchange code for tokens via API route
        const response = await fetch('/api/auth-agent/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            code_verifier: codeVerifier
          }),
        })

        const responseData = await response.json()

        if (!response.ok) {
          setError(responseData.error_description || responseData.error || 'Token exchange failed')
          setStatus('Authentication failed')
          return
        }

        // Store agent session data in localStorage for DashboardClient
        // Use data from exchange response (agent_id and model)
        if (responseData.agent_id) {
          try {
            // Create synthetic user for agent
            const agentUser = {
              id: responseData.agent_id,
              email: `${responseData.agent_id}@agent.local`,
              email_confirmed_at: new Date().toISOString(),
              app_metadata: { agent: true, model: responseData.model },
              user_metadata: { agent_id: responseData.agent_id, model: responseData.model },
              aud: 'authenticated',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            
            // Store in localStorage for DashboardClient
            window.localStorage.setItem('auth-agent-session-data', JSON.stringify({
              agentId: responseData.agent_id,
              model: responseData.model,
              user: agentUser,
            }))
          } catch (error) {
            console.error('Failed to store agent session:', error)
          }
        }

        setStatus('Success! Redirecting to dashboard…')
        setTimeout(() => {
          router.push('/dashboard')
        }, 800)
      } catch (error: any) {
        console.error('Auth Agent callback error:', error)
        setError(error.message || 'Unexpected error during authentication')
        setStatus('Authentication failed')
      }
    }

    handleAuth()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center">
          {error ? (
            <>
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Authentication Failed
              </h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => router.push('/ai-auth/login')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all"
              >
                Try Again
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 mb-4">
                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Completing Sign In
              </h1>
              <p className="text-gray-600">{status}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AuthAgentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 mb-4">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Loading...
            </h1>
          </div>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
