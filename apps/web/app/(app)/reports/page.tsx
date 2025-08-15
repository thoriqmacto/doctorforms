'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
    getReports,
    deleteReport,
    getHospitals,
    getTemplates,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ReportsPage() {
    const { data, isLoading, mutate } = useSWR(['/reports'], () =>
        getReports().then((r: any) => r)
    );
    const { data: hospitalsData } = useSWR(['/hospitals'], () =>
        getHospitals().then((r: any) => r)
    );
    const { data: templatesData } = useSWR(['/templates'], () =>
        getTemplates().then((r: any) => r)
    );

    const [name, setName] = useState('');
    const [hospitalId, setHospitalId] = useState('');
    const [templateId, setTemplateId] = useState('');

    const rows = data?.data ?? [];
    const hospitals = hospitalsData?.data ?? [];
    const templates = templatesData?.data ?? [];
    const newReportHref = `/reports/new?name=${encodeURIComponent(name)}&hospitalId=${hospitalId}&templateId=${templateId}`;

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
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Report name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-48"
                        />
                        <Select value={hospitalId} onValueChange={setHospitalId}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select hospital" />
                            </SelectTrigger>
                            <SelectContent>
                                {hospitals.map((h: any) => (
                                    <SelectItem key={h.id} value={String(h.id)}>
                                        {h.attributes?.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={templateId} onValueChange={setTemplateId}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select template" />
                            </SelectTrigger>
                            <SelectContent>
                                {templates.map((t: any) => (
                                    <SelectItem key={t.id} value={String(t.id)}>
                                        {t.attributes?.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Link href={newReportHref}>
                            <Button disabled={!hospitalId || !templateId}>
                                Create Report
                            </Button>
                        </Link>
                    </div>
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

