'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    getReports,
    deleteReport,
    getHospitals,
    getTemplates,
    getPatients,
    getTests,
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
import Breadcrumbs from '@/components/Breadcrumbs';

export default function ReportsPage() {
    const router = useRouter();
    const { data, isLoading, mutate } = useSWR(['/reports'], () =>
        getReports().then((r: any) => r)
    );
    const { data: hospitalsData } = useSWR(['/hospitals'], () =>
        getHospitals().then((r: any) => r)
    );
    const { data: templatesData } = useSWR(['/templates'], () =>
        getTemplates().then((r: any) => r)
    );
    const { data: patientsData } = useSWR(['/patients'], () =>
        getPatients().then((r: any) => r)
    );
    const { data: testsData } = useSWR(['/tests'], () =>
        getTests().then((r: any) => r)
    );

    const [name, setName] = useState('');
    const [hospitalId, setHospitalId] = useState('');
    const [templateId, setTemplateId] = useState('');

    const rows = data?.data ?? [];
    const hospitals = hospitalsData?.data ?? [];
    const templates = templatesData?.data ?? [];
    const patients = patientsData?.data ?? [];
    const tests = testsData?.data ?? [];

    const hospitalsMap = new Map<string, any>(
        hospitals.map((h: any) => [String(h.id), h])
    );
    const patientsMap = new Map<string, any>(
        patients.map((p: any) => [String(p.id), p])
    );
    const testsMap = new Map<string, any>(
        tests.map((t: any) => [String(t.id), t])
    );
    const hospitalName =
        hospitals.find((h: any) => String(h.id) === hospitalId)?.attributes?.name ?? '';
    const templateName =
        templates.find((t: any) => String(t.id) === templateId)?.attributes?.name ?? '';
    const newReportHref = (() => {
        const params = new URLSearchParams({
            name,
            hospitalId,
            templateId,
            hospitalName,
            templateName,
        });
        return `/reports/new?${params.toString()}`;
    })();

    async function handleDelete(id: number | string) {
        if (!confirm('Delete this report?')) return;
        await deleteReport(id);
        mutate();
    }

    function handleCreate() {
        if (!hospitalId || !templateId) return;
        router.push(newReportHref);
    }

    return (
        <div className="space-y-4">
            <Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Reports' }]} />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Reports</CardTitle>
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Patient Name"
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
                        <Button
                            onClick={handleCreate}
                            disabled={!hospitalId || !templateId}
                        >
                            Create Report
                        </Button>
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
                                    <TableHead>Patient Name</TableHead>
                                    <TableHead>Test Method</TableHead>
                                    <TableHead>Hospital Name</TableHead>
                                    <TableHead className="text-right w-40">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((r: any) => {
                                    const patientId = r.relationships?.patient?.data?.id;
                                    const patient = patientId
                                        ? patientsMap.get(String(patientId))
                                        : undefined;
                                    const patientName =
                                        patient?.attributes?.name ??
                                        patient?.attributes?.values?.patient_name ??
                                        '-';

                                    const testId = r.relationships?.test?.data?.id;
                                    const test = testId
                                        ? testsMap.get(String(testId))
                                        : undefined;
                                    const testName = test?.attributes?.name ?? '-';

                                    const hospitalId = r.relationships?.hospital?.data?.id;
                                    const hospital = hospitalId
                                        ? hospitalsMap.get(String(hospitalId))
                                        : undefined;
                                    const hospitalName = hospital?.attributes?.name ?? '-';

                                    return (
                                        <TableRow key={r.id} className="border-b hover:bg-muted/30">
                                            <TableCell>{r.id}</TableCell>
                                            <TableCell>{r.attributes?.title ?? '-'}</TableCell>
                                            <TableCell>{patientName}</TableCell>
                                            <TableCell>{testName}</TableCell>
                                            <TableCell>{hospitalName}</TableCell>
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
                                                        View
                                                    </Button>
                                                </Link>
                                                <Link href={`/reports/${r.id}/edit`}>
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

