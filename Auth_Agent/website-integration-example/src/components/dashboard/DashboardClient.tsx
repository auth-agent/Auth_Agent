'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'
import DashboardContent from './DashboardContent'
import { Database } from '@/lib/supabase'

interface Profile {
  id: string
  user_id: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  website: string | null
  created_at: string
  updated_at: string
}

type SocialLink = Database['public']['Tables']['social_links']['Row'] & { 
  display_name?: string
  custom_icon_url?: string 
}

export default function DashboardClient() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUserData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Helper function to convert database SocialLink to component SocialLink
  const convertSocialLinks = (links: Database['public']['Tables']['social_links']['Row'][]): SocialLink[] => {
    return links.map(link => ({
      ...link,
      display_name: (link.display_name || undefined) as string | undefined,
      custom_icon_url: (link.custom_icon_url || undefined) as string | undefined,
    })) as SocialLink[]
  }

  const loadUserData = async () => {
    if (!supabase) {
      setError('Supabase client not available')
      setLoading(false)
      return
    }

    try {
      // Check for Auth Agent session first (client-side)
      if (typeof window !== 'undefined') {
        const agentSessionData = window.localStorage.getItem('auth-agent-session-data')
        if (agentSessionData) {
          try {
            const { agentId, model, user: agentUser } = JSON.parse(agentSessionData)
            
            // Generate a deterministic UUID from agent ID (for Supabase user_id requirement)
            // Using crypto API to create a proper UUID v5-like hash
            const generateAgentUUID = async (agentId: string): Promise<string> => {
              // Create a deterministic hash from the agent ID
              const encoder = new TextEncoder()
              const data = encoder.encode(`agent-${agentId}`)
              const hashBuffer = await crypto.subtle.digest('SHA-256', data)
              const hashArray = Array.from(new Uint8Array(hashBuffer))
              const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
              
              // Format as UUID v4 (RFC 4122)
              return [
                hex.slice(0, 8),
                hex.slice(8, 12),
                '4' + hex.slice(13, 16), // version 4
                ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20), // variant bits (10)
                hex.slice(20, 32)
              ].join('-')
            }
            
            // Use API route to create/get agent profile (bypasses RLS)
            const profileResponse = await fetch('/api/auth-agent/profile', {
              method: 'POST',
            })

            if (!profileResponse.ok) {
              const errorData = await profileResponse.json().catch(() => ({}))
              console.error('Error creating/fetching agent profile:', errorData)
              setError('Failed to load agent profile')
              setLoading(false)
              return
            }

            const { profile: agentProfile } = await profileResponse.json()

            if (!agentProfile) {
              setError('Failed to create agent profile')
              setLoading(false)
              return
            }

            // Generate UUID for user object
            const agentUserId = await generateAgentUUID(agentId)
            const agentUserWithUUID = {
              ...agentUser,
              id: agentUserId,
            } as User
            setUser(agentUserWithUUID)
            setProfile(agentProfile)

            // Get social links using API route or directly (reading is allowed)
            const { data: socialLinksData } = await supabase
              .from('social_links')
              .select('*')
              .eq('profile_id', agentProfile.id)
              .order('display_order', { ascending: true })

            setSocialLinks(convertSocialLinks(socialLinksData || []))
            setLoading(false)
            return
          } catch (agentError) {
            console.error('Error processing agent session:', agentError)
            // Fall through to regular auth
          }
        }
      }

      // Get current user (regular Supabase auth)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
        console.error('DashboardClient: No valid session')
        window.location.href = '/auth'
        return
      }

      const currentUser = session.user
      setUser(currentUser)

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single()

      // If profile doesn't exist, create it automatically
      if (profileError || !profile) {
        console.log('DashboardClient: Profile not found, creating...')
        await createProfile(currentUser)
        return
      }

      setProfile(profile)

      // Get social links
      const { data: socialLinksData } = await supabase
        .from('social_links')
        .select('*')
        .eq('profile_id', profile.id)
        .order('display_order', { ascending: true })

      setSocialLinks(convertSocialLinks(socialLinksData || []))
      
    } catch (error: unknown) {
      console.error('DashboardClient: Error loading user data:', error)
      setError('We had trouble loading your account. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async (user: User) => {
    if (!supabase) return

    try {
      // First, try to get the profile again in case it was created between our last check
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (existingProfile) {
        console.log('DashboardClient: Profile found on retry:', existingProfile)
        setProfile(existingProfile)
        
        // Get social links for existing profile
        const { data: socialLinks } = await supabase
          .from('social_links')
          .select('*')
          .eq('profile_id', existingProfile.id)
          .order('display_order', { ascending: true })
        
        setSocialLinks(convertSocialLinks(socialLinks || []))
        return
      }

      // Generate a username from email
      const emailPrefix = user.email?.split('@')[0] || 'user'
      const username = emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000)
      
      console.log('DashboardClient: Creating profile with username:', username)

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          username: username,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          avatar_url: user.user_metadata?.avatar_url
        })
        .select()
        .single()

      if (createError) {
        console.error('DashboardClient: Error creating profile:', createError)
        
        // Handle specific error cases with user-friendly messages
        if (createError.message.includes('duplicate key value') || createError.message.includes('unique constraint')) {
          // Profile already exists, try to fetch it
          await loadUserData()
          return
        }
        
        setError('We had trouble setting up your account. Please try again, or contact support if the problem persists.')
        return
      }

      console.log('DashboardClient: Profile created successfully:', newProfile)
      setProfile(newProfile)
      setSocialLinks([])
      
    } catch (error: unknown) {
      console.error('DashboardClient: Error in createProfile:', error)
      setError('We encountered an issue setting up your account. Please refresh the page and try again.')
    }
  }

  const handleProfileUpdate = () => {
    // Reload profile data
    loadUserData()
  }

  const handleSocialLinksUpdate = () => {
    // Reload social links data
    loadUserData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Friendly icon */}
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-3">Almost there!</h1>
            <p className="text-gray-600 mb-6">
              We&apos;re having trouble loading your dashboard. This usually resolves quickly.
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={() => {
                  setError(null)
                  setLoading(true)
                  loadUserData()
                }}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Try Again
              </button>
              
              <button 
                onClick={() => {
                  window.location.reload()
                }}
                className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Refresh Page
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-3">
                Still having trouble?
              </p>
              <button 
                onClick={() => {
                  supabase?.auth.signOut()
                  window.location.href = '/auth'
                }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Sign out and try again
              </button>
            </div>
          </div>
          
          {/* Technical details hidden by default, only for debugging */}
          <details className="mt-4 text-left">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
              Technical details (for support)
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-gray-600 font-mono break-all">
              {error}
            </div>
          </details>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardContent 
      user={user}
      profile={profile}
      socialLinks={socialLinks}
      onProfileUpdate={handleProfileUpdate}
      onSocialLinksUpdate={handleSocialLinksUpdate}
    />
  )
} 