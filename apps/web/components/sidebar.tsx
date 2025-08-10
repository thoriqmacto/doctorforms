import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Sidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground w-64 border-r border-sidebar-border p-4 hidden md:block">
      <nav className="space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Home className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </nav>
    </aside>
  )
}
