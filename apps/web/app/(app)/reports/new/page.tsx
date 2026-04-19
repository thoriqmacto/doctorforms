'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import useSWR from 'swr';
import { getTemplate, createReport, getReport, getHospital, getPatient, getUser } from '@/lib/api';
import TemplateFormRenderer from '@/components/form/TemplateFormRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateReportPdf } from '@/lib/pdf';
import Breadcrumbs from '@/components/Breadcrumbs';

function NewReportPageContent() {
    const sp = useSearchParams();
    const router = useRouter();
    const templateId = sp.get('templateId');
    const patientId = sp.get('patientId');
    const testId = sp.get('testId');
    const hospitalId = sp.get('hospitalId');
    const name = sp.get('name');
    const hospitalName = sp.get('hospitalName');
    const templateNameParam = sp.get('templateName');

    const { data, isLoading } = useSWR(
        templateId ? ['/templates', templateId] : null,
        () => getTemplate(templateId!, { include: 'fields' }).then((r: any) => r)
    );
    const { data: hospitalRes, isLoading: hospitalLoading } = useSWR(
        hospitalId ? ['/hospitals', hospitalId] : null,
        () => getHospital(hospitalId!).then((r: any) => r)
    );
    const { data: patientRes, isLoading: patientLoading } = useSWR(
        patientId ? ['/patients', patientId] : null,
        () => getPatient(patientId!).then((r: any) => r)
    );
    const { data: userRes, isLoading: userLoading } = useSWR(
        ['/users', '1'],
        () => getUser(1).then((r: any) => r)
    );

    const tpl = data?.data;
    const grouped = useMemo(() => tpl?.meta?.grouped_sections ?? [], [tpl]);
    const reportFormSections = useMemo(
        () => grouped.filter((section: any) => section?.section?.trim().toLowerCase() !== 'header'),
        [grouped]
    );
    const hospital = hospitalRes?.data;

    async function onSubmit(values: Record<string, any>) {
        const groupedSections = reportFormSections ?? [];
        const fields: Array<{ template_field_id: number; value: string }> = [];
        const measurements: Array<{
            name: string;
            value: string;
            unit: string;
            category: string;
        }> = [];

        groupedSections.forEach((section: any) => {
            (section.items ?? []).forEach((field: any) => {
                const key = `f_${field.id}`;
                const rawValue = values[key];
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

        const payload = {
            template_id: Number(templateId),
            patient_id: Number(patientId),
            hospital_id: Number(hospitalId),
            user_id: 1,
            test_id: Number(testId),
            title: name,
            fields,
            measurements,
        };

        try {
            const created: any = await createReport(payload);
            const detail = await getReport(created.data.id, { include: 'patient,fields' });
            await generateReportPdf(detail);
            router.push('/reports');
        } catch (e) {
            console.error(e);
            alert('Failed to save');
        }
    }

    const templateName = templateNameParam ?? tpl?.attributes?.name;
    const hospitalLabel =
        hospital?.attributes?.name ?? hospitalName ?? `#${hospitalId}`;
    const templateLabel = templateName ?? `#${templateId}`;

    const initialValues = useMemo(() => {
        if (reportFormSections.length === 0) return {};

        const patientAttrs = patientRes?.data?.attributes ?? {};
        const userAttrs = userRes?.data?.attributes ?? {};
        const hospitalAttrs = hospital?.attributes ?? {};
        const vals: Record<string, string> = {};

        reportFormSections.forEach((sec: any) => {
            (sec.items ?? []).forEach((f: any) => {
                const key = `f_${f.id}`;
                const options = (f.attributes?.options ?? {}) as any;
                const defaultValue = options.default ? String(options.default) : '';

                if (f.attributes?.type === 'patient' && defaultValue.startsWith('patients.')) {
                    const attr = defaultValue.replace('patients.', '');
                    const value = patientAttrs[attr];
                    if (value !== undefined && value !== null) {
                        vals[key] = String(value);
                    }
                    return;
                }

                if (f.attributes?.type === 'user' && defaultValue.startsWith('users.')) {
                    const attr = defaultValue.replace('users.', '');
                    const userKey = attr === 'position_title' ? 'positionTitle' : attr;
                    const value = userAttrs[userKey];
                    if (value !== undefined && value !== null) {
                        vals[key] = String(value);
                    }
                    return;
                }

                if (defaultValue) {
                    vals[key] = defaultValue;
                }
            });
        });

        const labelMap = new Map<string, string>();
        reportFormSections.forEach((sec: any) =>
            sec.items.forEach((f: any) =>
                labelMap.set(f.attributes.label, `f_${f.id}`)
            )
        );
        const assign = (label: string, value?: string | null) => {
            const key = labelMap.get(label);
            if (key && value) vals[key] = value;
        };
        assign('Hospital Name', hospitalAttrs.name);
        assign('Unit / Department', (hospitalAttrs as any).unit_department ?? (hospitalAttrs as any).department);
        assign('Address', hospitalAttrs.address);
        assign('Phone / Fax', (hospitalAttrs as any).phone_fax ?? hospitalAttrs.phone);

        return vals;
    }, [hospital, patientRes, reportFormSections, userRes]);

    return (
        <div className="space-y-4">
            <Breadcrumbs
                items={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Reports', href: '/reports' },
                    { label: 'New Report' },
                ]}
            />
            <Card>
                <CardHeader>
                    <CardTitle>
                        New Report for {name} (Hospital: {hospitalLabel}, Template: {templateLabel})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading || hospitalLoading || patientLoading || userLoading ? 'Loading…' : (
                        <div className="page-a4 rounded-xl shadow-md">
                            <TemplateFormRenderer
                                groupedSections={reportFormSections}
                                onSubmit={onSubmit}
                                initialValues={initialValues}
                                enableSectionControls
                                showPrintButton
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


export default function NewReportPage() {
    return (
        <Suspense fallback={<div className="space-y-4">Loading…</div>}>
            <NewReportPageContent />
        </Suspense>
    );
}
