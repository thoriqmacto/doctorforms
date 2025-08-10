import { Button } from '@/components/ui/button'

export default function Footer() {
  return (
    <footer className="border-t px-4 py-3 text-sm text-muted-foreground flex items-center justify-between">
      <span>&copy; {new Date().getFullYear()} DoctorForms</span>
      <Button variant="ghost" size="sm">Feedback</Button>
    </footer>
  )
}
