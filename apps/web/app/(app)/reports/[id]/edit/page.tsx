'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import useSWR from 'swr';
import { getReport, getTemplate, updateReport } from '@/lib/api';
import TemplateFormRenderer from '@/components/form/TemplateFormRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function EditReportPage() {
    const params = useParams<{ id: string }>();
    const id = params.id;
    const router = useRouter();

    const { data: reportRes, isLoading } = useSWR(
        id ? ['/reports', id] : null,
        () => getReport(id, { include: 'fields,template' }).then((r: any) => r)
    );

    const report = reportRes?.data;
    const title = report?.attributes?.title ?? `Report #${id}`;
    const templateId = report?.relationships?.template?.data?.id;

    const { data: templateRes } = useSWR(
        templateId ? ['/templates', templateId] : null,
        () => getTemplate(templateId as string, { include: 'fields' }).then((r: any) => r)
    );
    const template = templateRes?.data;
    const grouped = useMemo(() => template?.meta?.grouped_sections ?? [], [template]);

    const reportFields = useMemo(
        () => report?.relationships?.fields?.data ?? [],
        [report]
    );
    const reportFieldMap = useMemo(
        () => new Map<string, any>(reportFields.map((f: any) => [f.label, f.value])),
        [reportFields]
    );
    const initialValues = useMemo(() => {
        const vals: Record<string, any> = {};
        grouped.forEach((sec: any) =>
            sec.items.forEach((f: any) => {
                const key = `f_${f.id}`;
                const val = reportFieldMap.get(f.attributes.label);
                if (val !== undefined) vals[key] = val;
            })
        );
        return vals;
    }, [grouped, reportFieldMap]);

    async function onSubmit(values: Record<string, any>) {
        try {
            await updateReport(id, { values });
            router.push('/reports');
        } catch (e) {
            console.error(e);
            alert('Failed to save');
        }
    }

    return (
        <div className="space-y-4">
            <Breadcrumbs
                items={[
                    { label: 'Dashboard', href: '/' },
                    { label: 'Reports', href: '/reports' },
                    { label: `Edit ${title}` },
                ]}
            />
            <Card>
                <CardHeader>
                    <CardTitle>Edit {title}</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        'Loading…'
                    ) : (
                        <div className="page-a4 rounded-xl shadow-md">
                            <TemplateFormRenderer
                                groupedSections={grouped}
                                onSubmit={onSubmit}
                                initialValues={initialValues}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
