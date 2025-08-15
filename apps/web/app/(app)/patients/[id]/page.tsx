'use client';

import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { getHospital, getPatient, getUser } from '@/lib/api';
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

export default function PatientDetailPage() {
    const params = useParams<{ id: string }>();
    const { data, isLoading } = useSWR(
        params?.id ? ['/patients', params.id] : null,
        () => getPatient(params.id).then((r: any) => r)
    );

    const patient = data?.data;
    const attrs = patient?.attributes ?? {};
    const name = attrs.name ?? (attrs as any).values?.patient_name ?? 'Patient';
    const values = Object.entries((attrs as any).values ?? {}) as [
        string,
        unknown
    ][];

    const baseAttrs = Object.entries(attrs)
        .filter(([k]) => k !== 'values')
        .map(([k, v]) => [k, v] as [string, unknown]);
    baseAttrs.unshift(['id', patient?.id]);

    const hospitalId = patient?.relationships?.hospital?.data?.id;
    const userId = patient?.relationships?.user?.data?.id;

    const { data: hospitalRes } = useSWR(
        hospitalId ? ['/hospitals', hospitalId] : null,
        () => getHospital(hospitalId as string).then((r: any) => r)
    );
    const { data: userRes } = useSWR(
        userId ? ['/users', userId] : null,
        () => getUser(userId as string).then((r: any) => r)
    );

    const hospital = hospitalRes?.data;
    const user = userRes?.data;

    return (
        <div className="space-y-4">
            <Breadcrumbs
                items={[
                    { label: 'Dashboard', href: '/' },
                    { label: 'Patients', href: '/patients' },
                    { label: name },
                ]}
            />
            {isLoading ? (
                'Loading…'
            ) : (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>{name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {baseAttrs.length > 0 && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Attribute</TableHead>
                                            <TableHead>Value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {baseAttrs.map(([k, v]) => (
                                            <TableRow key={k}>
                                                <TableCell>{k}</TableCell>
                                                <TableCell>{String(v ?? '-')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
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
                                                <TableCell>{String(v ?? '-')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {hospital && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Hospital</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <div>
                                    <span className="font-medium">ID:</span> {hospital.id}
                                </div>
                                <div>
                                    <span className="font-medium">Name:</span>{' '}
                                    {hospital.attributes?.name ?? '-'}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {user && (
                        <Card>
                            <CardHeader>
                                <CardTitle>User</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <div>
                                    <span className="font-medium">ID:</span> {user.id}
                                </div>
                                <div>
                                    <span className="font-medium">Name:</span>{' '}
                                    {user.attributes?.name ?? '-'}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
