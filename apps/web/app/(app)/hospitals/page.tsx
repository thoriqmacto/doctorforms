/* eslint-disable @next/next/no-img-element */
'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { getHospitals } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Breadcrumbs from '@/components/Breadcrumbs';

type HospitalAttributes = {
    name?: string;
    short_name?: string;
    logo_url?: string;
    address?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
    whatsapp_phone?: string;
    email?: string;
};

const resolveAssetUrl = (url?: string | null) => {
    if (!url) {
        return undefined;
    }

    if (/^https?:\/\//i.test(url)) {
        return url;
    }

    if (/^(\/storage|\/api)/i.test(url)) {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!apiBaseUrl) {
            return url;
        }

        try {
            const apiOrigin = new URL(apiBaseUrl).origin;
            return new URL(url, apiOrigin).toString();
        } catch {
            return url;
        }
    }

    return url;
};

const formatHospitalAddress = (attributes: HospitalAttributes) => {
    const structuredParts = [
        attributes.address_line_1,
        attributes.address_line_2,
        attributes.city,
        attributes.province,
        attributes.postal_code,
        attributes.country,
    ]
        .map((part) => part?.trim())
        .filter(Boolean);

    if (structuredParts.length > 0) {
        return structuredParts.join(', ');
    }

    return attributes.address?.trim() || '-';
};

const getHospitalInitial = (attributes: HospitalAttributes) => {
    const trimmedName = attributes.name?.trim();
    if (!trimmedName) {
        return '—';
    }

    return trimmedName[0]?.toUpperCase() ?? '—';
};

function HospitalLogo({ attributes }: { attributes: HospitalAttributes }) {
    const [hasError, setHasError] = useState(false);
    const resolvedLogoUrl = useMemo(() => resolveAssetUrl(attributes.logo_url), [attributes.logo_url]);
    const showImage = Boolean(resolvedLogoUrl && !hasError);

    return (
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border bg-muted/30 text-xs font-medium text-muted-foreground">
            {showImage ? (
                <img
                    src={resolvedLogoUrl}
                    alt={`${attributes.name ?? 'Hospital'} logo`}
                    className="h-full w-full object-contain"
                    onError={() => setHasError(true)}
                />
            ) : (
                <span>{getHospitalInitial(attributes)}</span>
            )}
        </div>
    );
}

export default function HospitalsPage() {
    const { data, isLoading } = useSWR(['/hospitals'], () => getHospitals());
    const rows = data?.data ?? [];

    return (
        <div className="space-y-4">
            <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Hospitals' }]} />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Hospitals</CardTitle>
                    <Link href="/hospitals/new">
                        <Button>New Hospital</Button>
                    </Link>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        'Loading…'
                    ) : rows.length === 0 ? (
                        <div className="px-6 py-8 text-sm text-muted-foreground">No hospitals found.</div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow className="border-b">
                                    <TableHead className="w-16">ID</TableHead>
                                    <TableHead className="w-16">Logo</TableHead>
                                    <TableHead className="w-[22%]">Name</TableHead>
                                    <TableHead className="w-[36%]">Address</TableHead>
                                    <TableHead className="w-[18%]">Contact</TableHead>
                                    <TableHead className="w-24 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((h: any) => {
                                    const attributes = (h.attributes ?? {}) as HospitalAttributes;
                                    const address = formatHospitalAddress(attributes);
                                    const contactPrimary = attributes.phone?.trim() || attributes.whatsapp_phone?.trim() || '-';
                                    const contactEmail = attributes.email?.trim();

                                    return (
                                        <TableRow key={h.id} className="border-b hover:bg-muted/30">
                                            <TableCell className="align-top">{h.id}</TableCell>
                                            <TableCell className="align-top">
                                                <HospitalLogo attributes={attributes} />
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <div className="max-w-[220px] truncate font-medium" title={attributes.name ?? '-'}>
                                                    {attributes.name ?? '-'}
                                                </div>
                                                {attributes.short_name ? (
                                                    <div className="max-w-[220px] truncate text-xs text-muted-foreground" title={attributes.short_name}>
                                                        {attributes.short_name}
                                                    </div>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <div className="max-w-[380px] truncate text-sm" title={address}>
                                                    {address}
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <div className="max-w-[180px] truncate text-sm" title={contactPrimary}>
                                                    {contactPrimary}
                                                </div>
                                                {contactEmail ? (
                                                    <div className="max-w-[180px] truncate text-xs text-muted-foreground" title={contactEmail}>
                                                        {contactEmail}
                                                    </div>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="w-24 space-x-2 text-right align-top">
                                                <Link href={`/hospitals/${h.id}`}>
                                                    <Button size="sm" variant="secondary">Edit</Button>
                                                </Link>
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
