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
        () => getReport(id, { include: 'fields,template,measurements' }),
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

    const editableSections = (groupedSections ?? []).filter(
        (section: any) => section?.section?.trim().toLowerCase() !== 'header'
    );

    // 3) Build initial values ONCE when both report and grouped are ready
    const [initialValues, setInitialValues] = useState<Record<string, any> | null>(null);
    const initHydrated = useRef(false);

    useEffect(() => {
        if (!initHydrated.current && report && editableSections.length > 0) {
            const reportFields = report?.relationships?.fields?.data ?? [];
            const reportMeasurements = report?.relationships?.measurements?.data ?? [];
            const byTemplateFieldId = new Map<string, any>(
                reportFields.map((f: any) => [String(f.template_field_id), f.value])
            );
            const measurementByName = new Map<string, any>(
                reportMeasurements.map((m: any) => [String(m.attributes?.name ?? ''), m.attributes?.value])
            );

            const vals: Record<string, any> = {};
            for (const sec of editableSections) {
                for (const f of sec.items ?? []) {
                    const key = `f_${f.id}`;
                    if (f.attributes?.type === 'measurement') {
                        const options = (f.attributes?.options ?? {}) as any;
                        const measurementName = options.measurement_name ?? f.attributes?.label;
                        const measurementValue = measurementByName.get(String(measurementName));
                        if (measurementValue !== undefined) {
                            vals[key] = measurementValue;
                            continue;
                        }
                    }

                    const val = byTemplateFieldId.get(String(f.id));
                    if (val !== undefined) vals[key] = val;
                }
            }
            setInitialValues(vals);
            initHydrated.current = true;
        }
    }, [editableSections, report]);

    async function onSubmit(values: Record<string, any>) {
        try {
            const fields: Array<{ template_field_id: number; value: string }> = [];
            const measurements: Array<{
                name: string;
                value: string;
                unit: string;
                category: string;
            }> = [];

            editableSections.forEach((sec: any) => {
                (sec.items ?? []).forEach((field: any) => {
                    const rawValue = values[`f_${field.id}`];
                    const normalizedValue = Array.isArray(rawValue)
                        ? rawValue.join(', ')
                        : rawValue && typeof rawValue === 'object'
                          ? JSON.stringify(rawValue)
                          : rawValue;

                    if (normalizedValue === undefined || normalizedValue === null || String(normalizedValue).trim() === '') {
                        return;
                    }

                    const options = (field.attributes?.options ?? {}) as any;
                    if (field.attributes?.type === 'measurement') {
                        measurements.push({
                            name: options.measurement_name ?? field.attributes?.label ?? 'Measurement',
                            value: String(normalizedValue),
                            unit: options.measurement_unit ?? '',
                            category: options.measurement_category ?? '',
                        });
                        return;
                    }

                    fields.push({
                        template_field_id: Number(field.id),
                        value: String(normalizedValue),
                    });
                });
            });

            await updateReport(id, { fields, measurements });
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
                    { label: 'Dashboard', href: '/dashboard' },
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
                                groupedSections={editableSections}
                                initialValues={initialValues}
                                onSubmit={onSubmit}
                                enableSectionControls
                                showPrintButton
                                viewHref={`/reports/${id}`}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
