'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import RedirectWhenAuthenticated from '@/components/auth/redirect-when-authenticated'

function ForgotPasswordForm() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus(null)
    setLoading(true)

    try {
      await forgotPassword(email)
      setStatus('If an account exists, a reset link has been sent to your email.')
    } catch {
      setStatus('Unable to send reset link. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>Enter your email to request a password reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
            <div className="flex items-center justify-between">
              <Button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Send reset link'}</Button>
              <Link href="/login" className="text-sm text-primary underline-offset-4 hover:underline">Back to login</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <RedirectWhenAuthenticated>
      <ForgotPasswordForm />
    </RedirectWhenAuthenticated>
  )
}
