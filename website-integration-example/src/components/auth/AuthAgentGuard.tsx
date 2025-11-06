'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AuthAgentGuardProps {
  children: React.ReactNode
  agentId: string
  model?: string
}

const SESSION_COOKIE = 'auth-agent-session'

// Create a synthetic Supabase user for agents
function createAgentUser(agentId: string, model?: string): User {
  return {
    id: agentId,
    email: `${agentId}@agent.local`,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: {
      agent: true,
      model: model || 'unknown',
    },
    user_metadata: {
      agent_id: agentId,
      model: model,
    },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as User
}

export default function AuthAgentGuard({ children, agentId, model }: AuthAgentGuardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if Auth Agent session exists in cookies (client-side)
        const allCookies = document.cookie.split(';')
        const sessionCookie = allCookies.find(c => c.trim().startsWith(`${SESSION_COOKIE}=`))
        
        if (!sessionCookie) {
          router.push('/ai-auth/login')
          return
        }

        // Parse session
        const cookieValue = sessionCookie.split('=')[1]
        if (!cookieValue) {
          router.push('/ai-auth/login')
          return
        }

        try {
          const session = JSON.parse(decodeURIComponent(cookieValue))
          
          if (!session || session.agentId !== agentId) {
            router.push('/ai-auth/login')
            return
          }

          // Check if session is expired
          if (session.expiresAt && session.expiresAt < Date.now()) {
            router.push('/ai-auth/login')
            return
          }

          // Create/ensure profile exists for agent
          if (supabase) {
            const agentUser = createAgentUser(agentId, model)
            
            // Check if profile exists
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', agentId)
              .single()

            if (!existingProfile) {
              // Create profile for agent
              const username = `agent-${agentId.slice(-8)}`
              const { error: createError } = await supabase
                .from('profiles')
                .insert({
                  user_id: agentId,
                  username: username,
                  full_name: `AI Agent (${model || 'unknown'})`,
                  bio: `Authenticated via Auth Agent OAuth 2.1`,
                })

              if (createError) {
                console.error('Error creating agent profile:', createError)
                // Continue anyway - profile might already exist
              }
            }

            // Set a mock session in localStorage so DashboardClient can use it
            // We'll need to modify DashboardClient to check for agent sessions too
            // For now, we'll create a synthetic session
            if (typeof window !== 'undefined') {
              // Store agent session info for DashboardClient to use
              window.localStorage.setItem('auth-agent-session-data', JSON.stringify({
                agentId,
                model,
                user: agentUser,
              }))
            }
          }

          setLoading(false)
        } catch (parseError) {
          console.error('Failed to parse session:', parseError)
          router.push('/ai-auth/login')
        }
      } catch (err) {
        console.error('AuthAgentGuard error:', err)
        setError('Failed to verify session')
        setLoading(false)
      }
    }

    checkSession()
  }, [agentId, model, router])

  const handleSignOut = async () => {
    if (typeof window !== 'undefined') {
      // Clear agent session
      document.cookie = `${SESSION_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      window.localStorage.removeItem('auth-agent-session-data')
    }
    
    // Redirect to login
    router.push('/ai-auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading agent dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

