'use client';

import useSWR from 'swr';
import { getTemplates } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export default function TemplatesPage() {
    const { data, isLoading, error } = useSWR(['/templates'], () =>
        getTemplates().then((r: any) => r)
    );

    const rows = data?.data ?? [];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Templates</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? 'Loading…' : error ? 'Failed to load' : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((t: any) => (
                                    <TableRow key={t.id}>
                                        <TableCell>{t.id}</TableCell>
                                        <TableCell>{t.attributes.name}</TableCell>
                                        <TableCell>{t.attributes.description}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Link href={`/templates/${t.id}`}>
                                                <Button variant="secondary" size="sm">Open</Button>
                                            </Link>
                                            <Link href={`/patients/new?templateId=${t.id}`}>
                                                <Button size="sm">Use Template</Button>
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
