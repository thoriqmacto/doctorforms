'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import useSWR from 'swr';
import { getTemplate, createReport, getReport, getHospital } from '@/lib/api';
import TemplateFormRenderer from '@/components/form/TemplateFormRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateReportPdf } from '@/lib/pdf';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function NewReportPage() {
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

    const tpl = data?.data;
    const grouped = useMemo(() => tpl?.meta?.grouped_sections ?? [], [tpl]);
    const hospital = hospitalRes?.data;

    async function onSubmit(values: Record<string, any>) {
        const payload = {
            template_id: Number(templateId),
            patient_id: Number(patientId),
            hospital_id: Number(hospitalId),
            user_id: 1,
            test_id: Number(testId),
            title: name,
            values,
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
        if (!hospital || grouped.length === 0) return {};
        const labelMap = new Map<string, string>();
        grouped.forEach((sec: any) =>
            sec.items.forEach((f: any) =>
                labelMap.set(f.attributes.label, `f_${f.id}`)
            )
        );
        const attrs = hospital.attributes ?? {};
        const vals: Record<string, string> = {};
        const assign = (label: string, value?: string | null) => {
            const key = labelMap.get(label);
            if (key && value) vals[key] = value;
        };
        assign('Hospital Name', attrs.name);
        assign('Unit / Department', (attrs as any).unit_department ?? (attrs as any).department);
        assign('Address', attrs.address);
        assign('Phone / Fax', (attrs as any).phone_fax ?? attrs.phone);
        return vals;
    }, [hospital, grouped]);

    return (
        <div className="space-y-4">
            <Breadcrumbs
                items={[
                    { label: 'Dashboard', href: '/' },
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
                    {isLoading || hospitalLoading ? 'Loading…' : (
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
