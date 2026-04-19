'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, status } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && status === 'anonymous') {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [loading, pathname, router, status])

  if (loading || status === 'anonymous' || !user) {
    return <div className="p-6 text-sm text-muted-foreground">Checking session...</div>
  }

  return <>{children}</>
}
