import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardTextareaFocusTestCard } from "@/components/dashboard-textarea-focus-test-card"

export default function Home() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Welcome to DoctorForms.</p>
          <Button className="mt-4">Create Form</Button>
        </CardContent>
      </Card>

      <DashboardTextareaFocusTestCard />
    </div>
  )
}
