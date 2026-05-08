'use client';

import Link from 'next/link';
import useSWR from 'swr';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getTests } from '@/lib/api';

export default function TestsPage() {
    const { data, isLoading } = useSWR(['/tests'], () => getTests() as Promise<any>);
    const rows = data?.data ?? [];

    return (
        <div className="space-y-4">
            <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tests' }]} />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Tests</CardTitle>
                    <Link href="/tests/new"><Button>New Test</Button></Link>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? 'Loading…' : rows.length === 0 ? (
                        <div className="px-6 py-8 text-sm text-muted-foreground">No tests found.</div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/40"><TableRow className="border-b">
                                <TableHead className="w-16">ID</TableHead><TableHead className="w-24">Code</TableHead><TableHead>Name</TableHead><TableHead className="w-28">Type</TableHead><TableHead>Description</TableHead><TableHead className="w-24 text-right">Actions</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {rows.map((test: any) => {
                                    const attrs = test.attributes ?? {};
                                    return <TableRow key={test.id} className="border-b hover:bg-muted/30">
                                        <TableCell>{test.id}</TableCell>
                                        <TableCell>{attrs.code || '-'}</TableCell>
                                        <TableCell className="font-medium">{attrs.name || '-'}</TableCell>
                                        <TableCell>{attrs.type || '-'}</TableCell>
                                        <TableCell><div className="max-w-[420px] truncate" title={attrs.description || '-'}>{attrs.description || '-'}</div></TableCell>
                                        <TableCell className="text-right"><Link href={`/tests/${test.id}`}><Button size="sm" variant="secondary">Edit</Button></Link></TableCell>
                                    </TableRow>
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
