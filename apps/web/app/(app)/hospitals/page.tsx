'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { getHospitals } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function HospitalsPage() {
    const { data, isLoading } = useSWR(['/hospitals'], () => getHospitals());
    const rows = data?.data ?? [];

    return (
        <div className="space-y-4">
            <Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Hospitals' }]} />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Hospitals</CardTitle>
                    <Link href="/hospitals/new">
                        <Button>New Hospital</Button>
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
                                    <TableHead>Address</TableHead>
                                    <TableHead className="text-right w-40">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((h: any) => (
                                    <TableRow key={h.id} className="border-b hover:bg-muted/30">
                                        <TableCell>{h.id}</TableCell>
                                        <TableCell>{h.attributes.name}</TableCell>
                                        <TableCell>{h.attributes.address}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Link href={`/hospitals/${h.id}`}>
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
