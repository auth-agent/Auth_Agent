'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { Loader2, Mail, AlertCircle } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailUnverified, setEmailUnverified] = useState(false)
  const [unverifiedUserEmail, setUnverifiedUserEmail] = useState<string>('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // Check for Auth Agent session first (client-side)
    if (typeof window !== 'undefined') {
      const agentSessionData = window.localStorage.getItem('auth-agent-session-data')
      if (agentSessionData) {
        try {
          const { user: agentUser } = JSON.parse(agentSessionData)
          // Agent session found, allow through (DashboardClient will handle it)
          setUser(agentUser as User)
          setLoading(false)
          return
        } catch (error) {
          console.error('AuthGuard: Error parsing agent session:', error)
          // Fall through to regular auth check
        }
      }
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase!.auth.getSession()
        console.log('AuthGuard: Initial session check:', { session: !!session, error })
        
        if (error) {
          console.error('AuthGuard: Session error:', error)
          window.location.href = '/auth'
          return
        }

        if (session?.user) {
          // Check if email is verified using Supabase's built-in verification
          if (!session.user.email_confirmed_at) {
            console.log('AuthGuard: User email not verified')
            setEmailUnverified(true)
            setUnverifiedUserEmail(session.user.email || '')
            setLoading(false)
            return
          }
          setUser(session.user)
        } else {
          // No session, redirect to auth
          window.location.href = '/auth'
          return
        }
      } catch (error) {
        console.error('AuthGuard: Error getting session:', error)
        window.location.href = '/auth'
        return
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase!.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthGuard: Auth state change:', { event, session: !!session })
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Check if email is verified using Supabase's built-in verification
          if (!session.user.email_confirmed_at) {
            console.log('AuthGuard: User email not verified')
            setEmailUnverified(true)
            setUnverifiedUserEmail(session.user.email || '')
            setUser(null)
            return
          }
          setUser(session.user)
          setEmailUnverified(false)
          setUnverifiedUserEmail('')
          setLoading(false)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setEmailUnverified(false)
          setUnverifiedUserEmail('')
          window.location.href = '/auth'
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
  }

  const resendVerification = async () => {
    if (!supabase || !unverifiedUserEmail) return
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: unverifiedUserEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`
        }
      })
      
      if (error) throw error
      alert('Verification email sent! Check your inbox.')
    } catch (error: any) {
      alert('Error sending verification email: ' + error.message)
    }
  }

  if (loading) {
    return fallback || (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (emailUnverified) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md mx-auto px-6 py-8 text-center">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verification Required</h1>
          <p className="text-gray-600 mb-6">
            Please verify your email address before accessing your dashboard. Check your inbox for the confirmation link.
          </p>
          <div className="space-y-3">
            <button
              onClick={resendVerification}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Mail className="h-4 w-4 mr-2" />
              Resend Verification Email
            </button>
            <button
              onClick={handleSignOut}
              className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 