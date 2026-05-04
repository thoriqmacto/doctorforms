'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardTextareaFocusTestCard } from '@/components/dashboard-textarea-focus-test-card'
import { useAuth } from '@/components/auth-provider'

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground">Welcome to DoctorForms.</p>
          <p className="text-sm text-muted-foreground">Role: {user?.role ?? 'staff'}</p>
        </CardContent>
      </Card>

    </div>
  )
}
