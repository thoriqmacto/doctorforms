'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import {
    getReport,
    getPatient,
    getHospital,
    getTests,
    getTemplate,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function ReportDetailPage() {
    const params = useParams<{ id: string }>();
    const id = params.id;

    const { data, isLoading } = useSWR(
        id ? ['/reports', id] : null,
        () => getReport(id, { include: 'fields,template' }).then((r: any) => r)
    );

    const report = data?.data;
    const attrs = report?.attributes ?? {};
    const title = attrs.title ?? `Report #${id}`;
    const reportFields = report?.relationships?.fields?.data ?? [];
    const templateId = report?.relationships?.template?.data?.id;

    const { data: templateRes } = useSWR(
        templateId ? ['/templates', templateId] : null,
        () => getTemplate(templateId as string, { include: 'fields' }).then((r: any) => r)
    );
    const template = templateRes?.data;
    const templateFields =
        template?.meta?.grouped_sections?.flatMap((sec: any) => sec.items) ?? [];

    const reportFieldMap = new Map<string, any>(
        reportFields.map((f: any) => [f.label, f])
    );
    const allFields = templateFields.map((f: any) => {
        const found = reportFieldMap.get(f.attributes.label);
        return {
            id: f.id,
            label: f.attributes.label,
            value: found?.value ?? '',
        };
    });

    const patientId = report?.relationships?.patient?.data?.id;
    const hospitalId = report?.relationships?.hospital?.data?.id;
    const testId = report?.relationships?.test?.data?.id;

    const { data: patientRes } = useSWR(
        patientId ? ['/patients', patientId] : null,
        () => getPatient(patientId as string).then((r: any) => r)
    );
    const { data: hospitalRes } = useSWR(
        hospitalId ? ['/hospitals', hospitalId] : null,
        () => getHospital(hospitalId as string).then((r: any) => r)
    );
    const { data: testsRes } = useSWR(['/tests'], () => getTests().then((r: any) => r));

    const patientName =
        patientRes?.data?.attributes?.name ??
        patientRes?.data?.attributes?.values?.patient_name ??
        '-';
    const hospitalName = hospitalRes?.data?.attributes?.name ?? '-';
    const testName =
        testsRes?.data?.find((t: any) => String(t.id) === String(testId))?.attributes?.name ??
        '-';

    return (
        <div className="space-y-4">
            <Breadcrumbs
                items={[
                    { label: 'Dashboard', href: '/' },
                    { label: 'Reports', href: '/reports' },
                    { label: title },
                ]}
            />
            {isLoading ? (
                'Loading…'
            ) : (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>{title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="page-a4 rounded-xl shadow-md space-y-4">
                                <div className="space-y-1">
                                    <div>
                                        <span className="font-medium">Patient:</span> {patientName}
                                    </div>
                                    <div>
                                        <span className="font-medium">Test:</span> {testName}
                                    </div>
                                    <div>
                                        <span className="font-medium">Hospital:</span> {hospitalName}
                                    </div>
                                </div>
                                {templateFields.length > 0 && (
                                    <Table>
                                        <TableHeader className="bg-muted/40">
                                            <TableRow className="border-b">
                                                <TableHead>Label</TableHead>
                                                <TableHead>Value</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allFields.map((f: any) => (
                                                <TableRow key={f.id} className="border-b">
                                                    <TableCell>{f.label ?? '-'}</TableCell>
                                                    <TableCell>{String(f.value ?? '')}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

