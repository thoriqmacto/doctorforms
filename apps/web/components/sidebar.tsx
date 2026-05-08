'use client'

import Link from 'next/link'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/sidebar-provider'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'

type Role = 'admin' | 'doctor' | 'staff'

export default function Sidebar() {
  const { open } = useSidebar()
  const { user } = useAuth()
  const pathname = usePathname()

  const role = (user?.role ?? 'staff') as Role

  const navItems: Array<{ href: string; label: string; exact?: boolean; roles: Role[] }> = [
    { href: '/dashboard', label: 'Dashboard', exact: true, roles: ['admin', 'doctor', 'staff'] },
    { href: '/reports', label: 'Reports', roles: ['admin', 'doctor', 'staff'] },
    { href: '/patients', label: 'Patients', roles: ['admin', 'doctor', 'staff'] },
    { href: '/templates', label: 'Templates', roles: ['admin', 'doctor'] },
    { href: '/hospitals', label: 'Hospitals', roles: ['admin'] },
    { href: '/tests', label: 'Tests', roles: ['admin'] },
    { href: '/users', label: 'Users', roles: ['admin'] },
    { href: '/feedback', label: 'Feedback', roles: ['admin'] },
  ]

  const visibleItems = navItems.filter((item) => item.roles.includes(role))

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <aside
      className={cn(
        'w-48 border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground',
        open ? 'block' : 'hidden',
      )}
    >
      <nav className="space-y-2">
        {visibleItems.map((item) => {
          const active = isActive(item.href, item.exact)
          return (
            <Button
              key={item.href}
              asChild
              variant={active ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start',
                !active && 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Link href={item.href}>
                {item.href === '/dashboard' ? <Home className="mr-2 h-4 w-4" /> : null}
                {item.label}
              </Link>
            </Button>
          )
        })}
      </nav>
    </aside>
  )
}
