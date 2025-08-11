// apps/web/components/auth-provider.mock.tsx
'use client'

import * as React from 'react'

type AuthContext = {
    user: { email: string } | null
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Just pass-through; no context required
    return <>{children}</>
}

export function useAuth(): AuthContext {
    return {
        user: null, // always “logged out”
        login: async () => {}, // no-op
        logout: async () => {}, // no-op
    }
}
