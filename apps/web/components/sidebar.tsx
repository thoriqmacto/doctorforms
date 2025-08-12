"use client"

import Link from 'next/link'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/sidebar-provider'
import { cn } from '@/lib/utils'

export default function Sidebar() {
  const { open, toggle } = useSidebar()
  return (
    <aside
      className={cn(
        'bg-sidebar text-sidebar-foreground w-64 border-r border-sidebar-border p-4',
        open ? 'block' : 'hidden'
      )}
    >
      <nav className="space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={open ? toggle : undefined}
        >
          <Home className="mr-2 h-4 w-4" /> Dashboard
        </Button>
        <Link href="/users" className="block" onClick={open ? toggle : undefined}>
          Users
        </Link>
        <Link href="/patients" className="block" onClick={open ? toggle : undefined}>
          Patients
        </Link>
        <Link href="/reports" className="block" onClick={open ? toggle : undefined}>
          Reports
        </Link>
        <Link href="/templates" className="block" onClick={open ? toggle : undefined}>
          Templates
        </Link>
      </nav>
    </aside>
  )
}
