"use client"

import Link from 'next/link'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/sidebar-provider'
import { cn } from '@/lib/utils'

export default function Sidebar() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { open, toggle } = useSidebar()
  return (
    <aside
      className={cn(
        'bg-sidebar text-sidebar-foreground w-48 border-r border-sidebar-border p-4',
        open ? 'block' : 'hidden'
      )}
    >
      <nav className="space-y-2">
        <Button variant="ghost" className="w-full justify-start hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <Home className="mr-2 h-4 w-4" /> Dashboard
        </Button>

        <Link href="/reports" className="block">
          Reports
        </Link>

        <Link href="/hospitals" className="block">
          Hospitals
        </Link>

        <Link href="/patients" className="block">
          Patients
        </Link>

        <Link href="/users" className="block">
          Users
        </Link>

        <Link href="/templates" className="block">
          Templates
        </Link>
      </nav>
    </aside>
  )
}
