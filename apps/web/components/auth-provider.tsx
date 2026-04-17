'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { forgotPassword as forgotPasswordApi, login as loginApi, logout as logoutApi, me as meApi } from '@/lib/api'

type AuthUser = {
  id: number
  name: string
  email: string
  role: 'admin' | 'doctor' | 'staff'
  position_title?: string | null
}

type AuthContextType = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = 'auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [token, setToken] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const router = useRouter()

  React.useEffect(() => {
    const hydrate = async () => {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        setLoading(false)
        return
      }

      try {
        const parsed = JSON.parse(stored)
        if (!parsed?.token) {
          setLoading(false)
          return
        }

        setToken(parsed.token)
        const res = await meApi()
        setUser(res?.data ?? null)
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
        setUser(null)
        setToken(null)
      } finally {
        setLoading(false)
      }
    }

    void hydrate()
  }, [])

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
  }

  const logout = async () => {
    try {
      await logoutApi()
    } finally {
      window.localStorage.removeItem(STORAGE_KEY)
      setUser(null)
      setToken(null)
      router.push('/login')
    }
  }

  const forgotPassword = async (email: string) => {
    await forgotPasswordApi({ email })
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, forgotPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
