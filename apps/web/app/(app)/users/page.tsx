'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { getUsers } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function UsersPage() {
    const { data, isLoading } = useSWR(['/users'], () => getUsers());
    const rows = data?.data ?? [];

    return (
        <div className="space-y-4">
            <Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Users' }]} />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Users</CardTitle>
                    <Link href="/users/new">
                        <Button>New User</Button>
                    </Link>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        'Loading…'
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow className="border-b">
                                    <TableHead className="w-20">ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead className="text-right w-40">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((u: any) => (
                                    <TableRow key={u.id} className="border-b hover:bg-muted/30">
                                        <TableCell>{u.id}</TableCell>
                                        <TableCell>{u.attributes.name}</TableCell>
                                        <TableCell>{u.attributes.email}</TableCell>
                                        <TableCell>{u.attributes.phone ?? '-'}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Link href={`/users/${u.id}`}>
                                                <Button size="sm" variant="secondary">Edit</Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

