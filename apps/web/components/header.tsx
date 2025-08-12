'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
// import { useAuth } from '@/components/auth-provider'
import { useAuth } from '@/components/auth-provider.mock'
import { useSidebar } from '@/components/sidebar-provider'

export default function Header() {
    const { user, login, logout } = useAuth()
    const { toggle } = useSidebar()

    const handleLogin = async () => {
        const email = window.prompt('Email')
        const password = window.prompt('Password')
        if (!email || !password) return
        try {
            await login(email, password)
        } catch (err) {
            console.error(err)
            window.alert('Login failed')
        }
    }

    const handleLogout = async () => {
        try {
            await logout()
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <header className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggle}
                    aria-label="Toggle sidebar"
                >
                    <Menu className="h-5 w-5" />
                </Button>
                <Link href="/" className="font-semibold">
                    DoctorForms
                </Link>
            </div>
            {user ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm">
                                {user.email.charAt(0).toUpperCase()}
                            </div>
                            <span className="hidden md:inline">{user.email}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href="/profile">Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleLogout}>Logout</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Button onClick={handleLogin}>Login</Button>
            )}
        </header>
    )
}
