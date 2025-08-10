import Link from 'next/link';

export default function Sidebar() {
    return (
        <aside className="p-4">
            <nav className="space-y-2">
                <Link href="/users" className="block">Users</Link>
                <Link href="/patients" className="block">Patients</Link>
                <Link href="/reports" className="block">Reports</Link>
                <Link href="/templates" className="block">Templates</Link>
            </nav>
        </aside>
    );
}

