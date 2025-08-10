'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { login as apiLogin, logout as apiLogout } from '@/lib/api'

interface User {
    id: number
    email: string
    token: string
}

interface AuthContextValue {
    user: User | null
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        const stored = window.localStorage.getItem('auth')
        if (stored) {
            try {
                setUser(JSON.parse(stored))
            } catch {
                // ignore
            }
        }
    }, [])

    const login = async (email: string, password: string) => {
        const data = await apiLogin({ email, password })
        const newUser: User = { id: data.id, email: data.email, token: data.token }
        setUser(newUser)
        window.localStorage.setItem('auth', JSON.stringify(newUser))
    }

    const logout = async () => {
        await apiLogout()
        setUser(null)
        window.localStorage.removeItem('auth')
    }

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
