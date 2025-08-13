'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { getReports, deleteReport } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ReportsPage() {
    const { data, isLoading, mutate } = useSWR(['/reports'], () =>
        getReports().then((r: any) => r)
    );

    const rows = data?.data ?? [];

    async function handleDelete(id: number | string) {
        if (!confirm('Delete this report?')) return;
        await deleteReport(id);
        mutate();
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Reports</CardTitle>
                    <Link href="/reports/new">
                        <Button>Create Report</Button>
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
                                    <TableHead>Title</TableHead>
                                    <TableHead>Patient</TableHead>
                                    <TableHead className="text-right w-40">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((r: any) => (
                                    <TableRow key={r.id} className="border-b hover:bg-muted/30">
                                        <TableCell>{r.id}</TableCell>
                                        <TableCell>{r.attributes?.title ?? '-'}</TableCell>
                                        <TableCell>{r.relationships?.patient?.data?.id ?? '-'}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {r.attributes?.pdf_url && (
                                                <Link href={r.attributes.pdf_url} target="_blank">
                                                    <Button variant="secondary" size="sm">
                                                        PDF
                                                    </Button>
                                                </Link>
                                            )}
                                            <Link href={`/reports/${r.id}`}>
                                                <Button size="sm" variant="secondary">
                                                    Edit
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete(r.id)}
                                            >
                                                Delete
                                            </Button>
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

