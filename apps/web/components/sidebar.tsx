"use client"

import Link from 'next/link'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/sidebar-provider'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { open, toggle } = useSidebar()
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Dashboard', exact: true },
    { href: '/reports', label: 'Reports' },
    { href: '/hospitals', label: 'Hospitals' },
    { href: '/patients', label: 'Patients' },
    { href: '/users', label: 'Users' },
    { href: '/templates', label: 'Templates' },
  ]

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <aside
      className={cn(
        'bg-sidebar text-sidebar-foreground w-48 border-r border-sidebar-border p-4',
        open ? 'block' : 'hidden'
      )}
    >
      <nav className="space-y-2">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact)
          return (
            <Button
              key={item.href}
              asChild
              variant={active ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start',
                !active && 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Link href={item.href}>
                {item.href === '/' ? <Home className="mr-2 h-4 w-4" /> : null}
                {item.label}
              </Link>
            </Button>
          )
        })}
      </nav>
    </aside>
  )
}
