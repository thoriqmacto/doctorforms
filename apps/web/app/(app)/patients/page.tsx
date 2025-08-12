'use client';

import useSWR from 'swr';
import { getPatients } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PatientsPage() {
    const { data, isLoading } = useSWR(['/patients'], () =>
        getPatients().then((r: any) => r)
    );

    const rows = data?.data ?? [];

    return (
        <div className="container mx-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Patients</h1>
                <Link href="/templates">
                    <Button variant="secondary">Templates</Button>
                </Link>
            </div>

            {isLoading ? (
                'Loading…'
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>All Patients</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow className="border-b">
                                    <TableHead className="w-20">ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>MRN</TableHead>
                                    <TableHead>Template</TableHead>
                                    <TableHead className="text-right w-60">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((p: any) => (
                                    <TableRow key={p.id} className="border-b hover:bg-muted/30">
                                        <TableCell>{p.id}</TableCell>
                                        <TableCell>{p.attributes?.name ?? p.attributes?.values?.patient_name ?? '-'}</TableCell>
                                        <TableCell>{p.attributes?.mrn ?? '-'}</TableCell>
                                        <TableCell>{p.relationships?.template?.data?.id ?? '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/patients/${p.id}`}>
                                                <Button size="sm" variant="secondary">View</Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
