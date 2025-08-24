'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { getReport, getTemplate, updateReport } from '@/lib/api';
import TemplateFormRenderer from '@/components/form/TemplateFormRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function EditReportPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    // 1) Calm SWR down while editing
    const swrOpts = {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        dedupingInterval: 120_000,
    };

    const { data: reportRes, isLoading } = useSWR(
        id ? ['/reports', id] : null,
        () => getReport(id, { include: 'fields,template' }),
        swrOpts
    );

    const report = reportRes?.data;
    const title = report?.attributes?.title ?? `Report #${id}`;
    const templateId = report?.relationships?.template?.data?.id;

    const { data: templateRes } = useSWR(
        templateId ? ['/templates', templateId] : null,
        () => getTemplate(templateId as string, { include: 'fields' }),
        swrOpts
    );

    // 2) Freeze grouped sections once per templateId
    const [groupedSections, setGroupedSections] = useState<any[] | null>(null);
    const groupedHydrated = useRef(false);

    useEffect(() => {
        if (!groupedHydrated.current && templateRes?.data?.meta?.grouped_sections) {
            setGroupedSections(templateRes.data.meta.grouped_sections);
            groupedHydrated.current = true;
        }
    }, [templateRes]);

    // 3) Build initial values ONCE when both report and grouped are ready
    const [initialValues, setInitialValues] = useState<Record<string, any> | null>(null);
    const initHydrated = useRef(false);

    useEffect(() => {
        if (!initHydrated.current && report && groupedSections) {
            const reportFields = report?.relationships?.fields?.data ?? [];
            const byLabel = new Map<string, any>(
                reportFields.map((f: any) => [f.label, f.value])
            );

            const vals: Record<string, any> = {};
            for (const sec of groupedSections) {
                for (const f of sec.items ?? []) {
                    const key = `f_${f.id}`;
                    const val = byLabel.get(f.attributes?.label);
                    if (val !== undefined) vals[key] = val;
                }
            }
            setInitialValues(vals);
            initHydrated.current = true;
        }
    }, [report, groupedSections]);

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
                    {isLoading || !groupedSections || !initialValues ? (
                        'Loading…'
                    ) : (
                        <div className="page-a4 rounded-xl shadow-md">
                            <TemplateFormRenderer
                                groupedSections={groupedSections}
                                initialValues={initialValues}
                                onSubmit={onSubmit}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
