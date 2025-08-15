'use client';

import useSWR from 'swr';
import Link from 'next/link';
import {
    getPatients,
    getHospitals,
    getReports,
    deletePatient,
} from '@/lib/api';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function PatientsPage() {
    const { data, isLoading, mutate } = useSWR(['/patients'], () =>
        getPatients().then((r: any) => r)
    );
    const { data: hospitalsData } = useSWR(['/hospitals'], () =>
        getHospitals().then((r: any) => r)
    );
    const { data: reportsData } = useSWR(['/reports'], () =>
        getReports().then((r: any) => r)
    );

    const rows = data?.data ?? [];
    const hospitals = hospitalsData?.data ?? [];
    const reports = reportsData?.data ?? [];

    const hospitalsMap = new Map<string, any>(
        hospitals.map((h: any) => [String(h.id), h])
    );

    const reportsMap = new Map<string, any[]>();
    reports.forEach((r: any) => {
        const patientId = r.relationships?.patient?.data?.id;
        if (patientId) {
            const list = reportsMap.get(String(patientId)) ?? [];
            list.push(r);
            reportsMap.set(String(patientId), list);
        }
    });

    async function handleDelete(id: number | string) {
        if (!confirm('Delete this patient?')) return;
        await deletePatient(id);
        mutate();
    }

    return (
        <div className="container mx-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Patients</h1>
                <Link href="/patients/new">
                    <Button>Add Patient</Button>
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
                                    <TableHead>Hospital</TableHead>
                                    <TableHead>Reports</TableHead>
                                    <TableHead className="text-right w-60">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((p: any) => {
                                    const hospitalId = p.relationships?.hospital?.data?.id;
                                    const hospital = hospitalId
                                        ? hospitalsMap.get(String(hospitalId))
                                        : undefined;
                                    const hospitalName = hospital?.attributes?.name ?? '-';

                                    const patientReports =
                                        reportsMap.get(String(p.id)) ?? [];

                                    return (
                                        <TableRow key={p.id} className="border-b hover:bg-muted/30">
                                            <TableCell>{p.id}</TableCell>
                                            <TableCell>
                                                {p.attributes?.name ??
                                                    p.attributes?.values?.patient_name ??
                                                    '-'}
                                            </TableCell>
                                            <TableCell>{p.attributes?.mrn ?? '-'}</TableCell>
                                            <TableCell>{hospitalName}</TableCell>
                                            <TableCell>
                                                {patientReports.length > 0 ? (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="secondary" size="sm">
                                                                Reports
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            {patientReports.map((r: any) => (
                                                                <DropdownMenuItem key={r.id} asChild>
                                                                    <Link href={`/reports/${r.id}`}>
                                                                        {r.attributes?.title ?? `Report ${r.id}`}
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Link href={`/patients/${p.id}`}>
                                                    <Button size="sm" variant="secondary">
                                                        Edit
                                                    </Button>
                                                </Link>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDelete(p.id)}
                                                >
                                                    Delete
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
