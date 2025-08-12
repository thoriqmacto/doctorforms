'use client';

import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { getPatient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export default function PatientDetailPage() {
    const params = useParams<{ id: string }>();
    const { data, isLoading } = useSWR(
        params?.id ? ['/patients', params.id] : null,
        () => getPatient(params.id).then((r: any) => r)
    );

    const patient = data?.data;
    const attrs = patient?.attributes ?? {};
    const values = Object.entries(attrs.values ?? {}) as [string, unknown][];

    return (
        <div className="space-y-4">
            {isLoading ? (
                'Loading…'
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {attrs.name ?? attrs.values?.patient_name ?? 'Patient'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <div>
                                <span className="font-medium">ID:</span> {patient?.id}
                            </div>
                            <div>
                                <span className="font-medium">MRN:</span> {attrs.mrn ?? '-'}
                            </div>
                            <div>
                                <span className="font-medium">Template ID:</span>{' '}
                                {patient?.relationships?.template?.data?.id ?? '-'}
                            </div>
                        </div>
                        {values.length > 0 && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Field</TableHead>
                                        <TableHead>Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {values.map(([k, v]) => (
                                        <TableRow key={k}>
                                            <TableCell>{k}</TableCell>
                                            <TableCell>{String(v)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
