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
  if (honorNextParam) {
    return <RedirectWithNext fallback={fallback}>{children}</RedirectWithNext>
  }
  return <RedirectToTarget target={fallback}>{children}</RedirectToTarget>
}

function RedirectToTarget({
  target,
  children,
}: {
  target: string
  children: React.ReactNode
}) {
  const { status, loading } = useAuth()
  const router = useRouter()

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

function RedirectWithNext({
  fallback,
  children,
}: {
  fallback: string
  children: React.ReactNode
}) {
  const searchParams = useSearchParams()
  const next = searchParams?.get('next')
  const target = next && next.startsWith('/') ? next : fallback
  return <RedirectToTarget target={target}>{children}</RedirectToTarget>
}
