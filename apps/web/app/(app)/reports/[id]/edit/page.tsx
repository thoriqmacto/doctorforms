'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { getHospital, getPatient, getReport, getTemplate, getUser, updateReport } from '@/lib/api';
import TemplateFormRenderer from '@/components/form/TemplateFormRenderer';
import SignatorySelector from '@/components/form/SignatorySelector';
import type { RenderContexts } from '@/lib/template-renderer/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Breadcrumbs from '@/components/Breadcrumbs';
import { buildReportModeHref } from '@/lib/reportViewModes';

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

    const { data: reportRes, isLoading, mutate: mutateReport } = useSWR(
        id ? ['/reports', id] : null,
        () => getReport(id, { include: 'fields,template,measurements,patient,user,hospital,signatory' }),
        swrOpts
    );

    const report = reportRes?.data;
    const title = report?.attributes?.title ?? `Report #${id}`;
    const templateId = report?.relationships?.template?.data?.id;
    const patientId = report?.relationships?.patient?.data?.id;
    const hospitalId = report?.relationships?.hospital?.data?.id;
    const userId = report?.relationships?.user?.data?.id;
    const initialSignatoryId = report?.relationships?.signatory?.data?.id
        ? Number(report.relationships.signatory.data.id)
        : null;
    const [signatoryId, setSignatoryId] = useState<number | null>(null);
    const signatoryHydrated = useRef(false);

    useEffect(() => {
        if (!signatoryHydrated.current && reportRes) {
            setSignatoryId(initialSignatoryId);
            signatoryHydrated.current = true;
        }
    }, [reportRes, initialSignatoryId]);

    const { data: patientRes } = useSWR(
        patientId ? ['/patients', patientId] : null,
        () => getPatient(patientId as string),
        swrOpts
    );
    const { data: hospitalRes } = useSWR(
        hospitalId ? ['/hospitals', hospitalId] : null,
        () => getHospital(hospitalId as string),
        swrOpts
    );
    const { data: userRes } = useSWR(
        userId ? ['/users', userId] : null,
        () => getUser(userId as string),
        swrOpts
    );

    const contexts: RenderContexts = {
        hospital: hospitalRes?.data?.attributes,
        patient: patientRes?.data?.attributes,
        user: userRes?.data?.attributes,
        report: {
            title: report?.attributes?.title,
            operator: report?.attributes?.operator,
            supervisor: report?.attributes?.supervisor,
            device: report?.attributes?.device,
        },
    };

    const { data: templateRes, mutate: mutateTemplate } = useSWR(
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
        if (!initHydrated.current && report && groupedSections) {
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
                    if (val !== undefined) {
                        vals[key] = val;
                    }
                }
            }
            setInitialValues(vals);
            initHydrated.current = true;
        }
    }, [editableSections, groupedSections, report]);

    async function onRefresh() {
        initHydrated.current = false;
        groupedHydrated.current = false;
        setInitialValues(null);
        setGroupedSections(null);
        await Promise.all([
            mutateReport(undefined, { revalidate: true }),
            mutateTemplate(undefined, { revalidate: true }),
        ]);
        toast.success('Form refreshed with latest server data.');
    }

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

            await updateReport(id, { fields, measurements, signatory_id: signatoryId });
            toast.success('Report saved successfully.');
            setTimeout(() => {
                router.push('/reports');
            }, 700);
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
                        <div className="mx-auto w-full max-w-6xl space-y-4">
                            <SignatorySelector
                                hospitalId={hospitalId ? Number(hospitalId) : null}
                                value={signatoryId}
                                onChange={setSignatoryId}
                                patientUserId={patientRes?.data?.relationships?.user?.data?.id
                                    ? Number(patientRes.data.relationships.user.data.id)
                                    : null}
                                helperText="Update the doctor whose signature will be embedded in this report."
                            />
                            <div className="rounded-xl border bg-white shadow-md">
                            <TemplateFormRenderer
                                groupedSections={editableSections}
                                initialValues={initialValues}
                                onSubmit={onSubmit}
                                enableSectionControls
                                showRefreshButton
                                onRefresh={onRefresh}
                                showDirtyState
                                warnOnLeaveWithUnsavedChanges
                                autosaveDraftKey={`report-edit-draft:${id}`}
                                showPrintButton={false}
                                contexts={contexts}
                                viewLinks={[
                                    { href: buildReportModeHref(id, 'html'), label: 'View HTML' },
                                    { href: buildReportModeHref(id, 'pdf'), label: 'View PDF' },
                                ]}
                            />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
