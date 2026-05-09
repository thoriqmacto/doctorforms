'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'

type Props = {
  children: React.ReactNode
  fallback?: string
  honorNextParam?: boolean
}

export default function RedirectWhenAuthenticated({
  children,
  fallback = '/dashboard',
  honorNextParam = false,
}: Props) {
  const { status, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const target = (() => {
    if (!honorNextParam) return fallback
    const next = searchParams?.get('next')
    return next && next.startsWith('/') ? next : fallback
  })()

  useEffect(() => {
    if (!loading && status === 'authenticated') {
      router.replace(target)
    }
  }, [loading, status, router, target])

  if (loading || status === 'authenticated') {
    return null
  }

  return <>{children}</>
}
