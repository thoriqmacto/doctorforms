'use client';

import useSWR from 'swr';
import { getTemplates, getTests } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type {
    TemplateResource,
    TemplatesIndexResponse,
} from '@/types/api';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function TemplatesPage() {
    const { data, isLoading, error } = useSWR<TemplatesIndexResponse>(
        ['/templates'],
        () => getTemplates({ include: 'test' }) as Promise<TemplatesIndexResponse>
    );

    const { data: testData } = useSWR(['/tests'], () =>
        getTests().then((r: any) => r)
    );

    const rows = data?.data ?? [];
    const tests = testData?.data ?? [];

    const testsMap = new Map<string, any>(
        tests.map((t:any) => [String(t.id), t])
    );

    return (
        <div className="space-y-4">
            <Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Templates' }]} />
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Templates</h1>
                <Link href="/templates/new">
                    <Button>Add Template</Button>
                </Link>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>All Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoading ? (
                        'Loading…'
                    ) : error ? (
                        'Failed to load'
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Test Method</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((t: TemplateResource) => {
                                    const testId = t.relationships?.test?.data?.id;
                                    const test = testId
                                        ? testsMap.get(String(testId))
                                        : undefined;
                                    const testName = test?.attributes?.code ?? '-';
                                    return (
                                        <TableRow key={t.id}>
                                            <TableCell>{t.id}</TableCell>
                                            <TableCell>{t.attributes.name}</TableCell>
                                            <TableCell>{testName}</TableCell>
                                            <TableCell>{t.attributes.description}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link href={`/templates/${t.id}/view`}>
                                                        <Button variant="ghost" size="sm">
                                                            View
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/templates/${t.id}/print`}>
                                                        <Button variant="ghost" size="sm">
                                                            Print
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/templates/${t.id}/edit`}>
                                                        <Button variant="secondary" size="sm">
                                                            Edit
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
