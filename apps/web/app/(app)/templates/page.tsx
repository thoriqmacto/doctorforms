'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { getTemplates, getTests } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface TestItem {
    id: number | string;
    attributes: {
        name: string;
    };
}

interface TemplateItem {
    id: number | string;
    attributes: {
        name: string;
        description: string;
    };
}

export default function TemplatesPage() {
    const [testId, setTestId] = useState<string>('');
    const sp = useSearchParams();
    const patientId = sp.get('patientId');

    const { data: testsData } = useSWR<{ data: TestItem[] }>(
        ['/tests'],
        () => getTests() as Promise<{ data: TestItem[] }>
    );
    const { data, isLoading, error } = useSWR<{ data: TemplateItem[] }>(
        testId ? ['/templates', testId] : null,
        () => getTemplates({ 'filter.test_id': testId }) as Promise<{ data: TemplateItem[] }>
    );

    const tests = testsData?.data ?? [];
    const rows = data?.data ?? [];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Select value={testId} onValueChange={setTestId}>
                        <SelectTrigger className="w-64">
                            <SelectValue placeholder="Select test" />
                        </SelectTrigger>
                        <SelectContent>
                            {tests.map((t: TestItem) => (
                                <SelectItem key={t.id} value={String(t.id)}>
                                    {t.attributes.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {!testId ? (
                        'Please select a test'
                    ) : isLoading ? (
                        'Loading…'
                    ) : error ? (
                        'Failed to load'
                    ) : (
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
                                {rows.map((t: TemplateItem) => (
                                    <TableRow key={t.id}>
                                        <TableCell>{t.id}</TableCell>
                                        <TableCell>{t.attributes.name}</TableCell>
                                        <TableCell>{t.attributes.description}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Link href={`/templates/${t.id}`}>
                                                <Button variant="secondary" size="sm">Open</Button>
                                            </Link>
                                            <Link href={`/templates/${t.id}/edit`}>
                                                <Button variant="secondary" size="sm">Edit</Button>
                                            </Link>
                                            <Link
                                                href={`/reports/new?templateId=${t.id}&testId=${testId}${patientId ? `&patientId=${patientId}` : ''}`}
                                            >
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
