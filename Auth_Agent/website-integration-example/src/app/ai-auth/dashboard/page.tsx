import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AuthAgentGuard from '@/components/auth/AuthAgentGuard'
import DashboardClient from '@/components/dashboard/DashboardClient'

const SESSION_COOKIE = 'auth-agent-session'

export default function AuthAgentDashboardPage() {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE)

  if (!sessionCookie) {
    redirect('/ai-auth/login')
  }

  let session: {
    accessToken: string
    refreshToken?: string
    agentId: string
    model?: string
    expiresAt: number
  } | null = null

  try {
    session = JSON.parse(sessionCookie.value)
  } catch (error) {
    console.error('Failed to parse Auth Agent session cookie:', error)
    cookieStore.delete(SESSION_COOKIE)
    redirect('/ai-auth/login')
  }

  if (!session) {
    redirect('/ai-auth/login')
  }

  return (
    <AuthAgentGuard agentId={session.agentId} model={session.model}>
      <DashboardClient />
    </AuthAgentGuard>
  )
}
