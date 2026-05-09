import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import RedirectWhenAuthenticated from '@/components/auth/redirect-when-authenticated'

export default function LandingPage() {
  return (
    <RedirectWhenAuthenticated>
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>DoctorForms</CardTitle>
            <CardDescription>
              Smart medical form workflows with role-based access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please login to continue to your dashboard.
            </p>
            <Button asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </RedirectWhenAuthenticated>
  )
}
