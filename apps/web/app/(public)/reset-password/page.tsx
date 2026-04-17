'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { resetPassword } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token') ?? ''
    const email = searchParams.get('email') ?? ''

    const hasValidParams = useMemo(() => token.length > 0 && email.length > 0, [token, email])
    const [password, setPassword] = useState('')
    const [passwordConfirmation, setPasswordConfirmation] = useState('')
    const [status, setStatus] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [completed, setCompleted] = useState(false)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setStatus(null)

        if (!hasValidParams) {
            setStatus('Invalid reset link. Please request a new password reset email.')
            return
        }

        setLoading(true)

        try {
            await resetPassword({
                email,
                token,
                password,
                password_confirmation: passwordConfirmation,
            })

            setCompleted(true)
            setStatus('Password has been reset successfully. You can now log in with your new password.')
        } catch {
            setStatus('Unable to reset password. Please verify the link and try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Reset Password</CardTitle>
                    <CardDescription>Create a new password for your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={email} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                required
                                minLength={8}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password-confirmation">Confirm New Password</Label>
                            <Input
                                id="password-confirmation"
                                type="password"
                                value={passwordConfirmation}
                                onChange={(event) => setPasswordConfirmation(event.target.value)}
                                required
                                minLength={8}
                            />
                        </div>
                        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
                        <div className="flex items-center justify-between">
                            <Button type="submit" disabled={loading || completed || !hasValidParams}>
                                {loading ? 'Submitting...' : 'Reset password'}
                            </Button>
                            <Link href="/login" className="text-sm text-primary underline-offset-4 hover:underline">
                                Back to login
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="mx-auto min-h-screen p-6" />}>
            <ResetPasswordForm />
        </Suspense>
    )
}
