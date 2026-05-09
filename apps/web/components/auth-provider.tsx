'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  forgotPassword as forgotPasswordApi,
  login as loginApi,
  logout as logoutApi,
  me as meApi,
  replayExpiredSessionRequests,
  resetSessionExpiryState,
  SESSION_EXPIRED_EVENT,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AuthUser = {
  id: number
  name: string
  email: string
  role: 'admin' | 'doctor' | 'staff'
  phone?: string | null
  position_title?: string | null
}

type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'expired'

type AuthContextType = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)
const STORAGE_KEY = 'auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [token, setToken] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [status, setStatus] = React.useState<AuthStatus>('loading')
  const [reauthEmail, setReauthEmail] = React.useState('')
  const [reauthPassword, setReauthPassword] = React.useState('')
  const [reauthLoading, setReauthLoading] = React.useState(false)
  const [reauthError, setReauthError] = React.useState<string | null>(null)
  const router = useRouter()

  React.useEffect(() => {
    const hydrate = async () => {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        setStatus('anonymous')
        setLoading(false)
        return
      }

      try {
        const parsed = JSON.parse(stored)
        if (!parsed?.token) {
          setStatus('anonymous')
          setLoading(false)
          return
        }

        setToken(parsed.token)
        const res = await meApi()
        setUser(res?.data ?? null)
        setStatus('authenticated')
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
        setUser(null)
        setToken(null)
        setStatus('anonymous')
      } finally {
        setLoading(false)
      }
    }

    void hydrate()
  }, [])

  React.useEffect(() => {
    const handleSessionExpired = () => {
      setReauthEmail(user?.email ?? '')
      setReauthPassword('')
      setReauthError(null)
      setStatus('expired')
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    }
  }, [user?.email])

  const login = async (email: string, password: string) => {
    const res = await loginApi({ email, password })
    const authToken = res?.data?.token as string
    const authUser = res?.data?.user as AuthUser

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: authToken,
        user: authUser,
      }),
    )

    setToken(authToken)
    setUser(authUser)
    setStatus('authenticated')
    resetSessionExpiryState()
    setReauthPassword('')
    setReauthError(null)
  }

  const logout = async () => {
    try {
      await logoutApi()
    } finally {
      window.localStorage.removeItem(STORAGE_KEY)
      setUser(null)
      setToken(null)
      setStatus('anonymous')
      router.push('/login')
    }
  }

  const forgotPassword = async (email: string) => {
    await forgotPasswordApi({ email })
  }

  const refreshUser = async () => {
    const res = await meApi()
    const fresh = (res?.data ?? null) as AuthUser | null
    setUser(fresh)
    if (fresh) {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...parsed, user: fresh }),
          )
        } catch {
          // ignore corrupted storage; AuthUser state is the source of truth
        }
      }
    }
  }

  const handleReauthenticate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setReauthError(null)
    setReauthLoading(true)

    try {
      await login(reauthEmail, reauthPassword)
      await replayExpiredSessionRequests()
      router.refresh()
    } catch {
      setReauthError('Invalid credentials. Please try again.')
    } finally {
      setReauthLoading(false)
    }
  }

  return (
    <>
      <AuthContext.Provider value={{ user, token, loading, status, login, logout, forgotPassword, refreshUser }}>
        {children}
      </AuthContext.Provider>
      <Dialog open={status === 'expired'}>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Session expired</DialogTitle>
            <DialogDescription>
              Your session has expired. Please sign in again to continue where you left off.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleReauthenticate}>
            <div className="space-y-2">
              <Label htmlFor="session-expired-email">Email</Label>
              <Input
                id="session-expired-email"
                type="email"
                value={reauthEmail}
                onChange={(event) => setReauthEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-expired-password">Password</Label>
              <Input
                id="session-expired-password"
                type="password"
                value={reauthPassword}
                onChange={(event) => setReauthPassword(event.target.value)}
                required
              />
            </div>
            {reauthError ? <p className="text-sm text-destructive">{reauthError}</p> : null}
            <Button className="w-full" type="submit" disabled={reauthLoading}>
              {reauthLoading ? 'Signing in...' : 'Sign in again'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
