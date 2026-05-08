'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getTemplate, createReport, getHospital, getPatient } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import TemplateFormRenderer from '@/components/form/TemplateFormRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Breadcrumbs from '@/components/Breadcrumbs';

function NewReportPageContent() {
    const { user } = useAuth();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const sp = useSearchParams();
    const router = useRouter();
    const templateId = sp.get('templateId'); const patientId = sp.get('patientId'); const testId = sp.get('testId'); const hospitalId = sp.get('hospitalId');
    const name = sp.get('name'); const hospitalName = sp.get('hospitalName'); const templateNameParam = sp.get('templateName');
    const toValidId = (value: string | null) => { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; };
    const templateIdNum = toValidId(templateId); const patientIdNum = toValidId(patientId); const testIdNum = toValidId(testId); const hospitalIdNum = toValidId(hospitalId);
    const hasContextError = !templateIdNum || !patientIdNum || !testIdNum || !hospitalIdNum;

    const { data, isLoading } = useSWR(templateIdNum ? ['/templates', templateIdNum] : null, () => getTemplate(templateIdNum!, { include: 'fields' }));
    const { data: hospitalRes, isLoading: hospitalLoading } = useSWR(hospitalIdNum ? ['/hospitals', hospitalIdNum] : null, () => getHospital(hospitalIdNum!));
    const { data: patientRes, isLoading: patientLoading } = useSWR(patientIdNum ? ['/patients', patientIdNum] : null, () => getPatient(patientIdNum!));

    const tpl = data?.data; const grouped = useMemo(() => tpl?.meta?.grouped_sections ?? [], [tpl]);
    const reportFormSections = useMemo(() => grouped.filter((section: any) => section?.section?.trim().toLowerCase() !== 'header'), [grouped]);
    const hospital = hospitalRes?.data;

    async function onSubmit(values: Record<string, any>) {
        setSubmitError(null);
        if (!user?.id) { setSubmitError('Cannot save report because authenticated user is unavailable.'); return; }
        if (hasContextError) { setSubmitError('Cannot create report because required context is missing: template/patient/hospital/test.'); return; }
        const fields: any[] = []; const measurements: any[] = [];
        reportFormSections.forEach((section: any) => (section.items ?? []).forEach((field: any) => {
            const rawValue = values[`f_${field.id}`]; const normalizedValue = Array.isArray(rawValue) ? rawValue.join(', ') : rawValue && typeof rawValue === 'object' ? JSON.stringify(rawValue) : rawValue;
            if (normalizedValue === undefined || normalizedValue === null || String(normalizedValue).trim() === '') return;
            const options = field.attributes?.options ?? {};
            if (field.attributes?.type === 'measurement') { measurements.push({ name: options.measurement_name ?? field.attributes?.label ?? 'Measurement', value: String(normalizedValue), unit: options.measurement_unit ?? '', category: options.measurement_category ?? '' }); return; }
            fields.push({ template_field_id: Number(field.id), value: String(normalizedValue) });
        }));
        const reportTitle = name?.trim() || patientRes?.data?.attributes?.name?.trim() || [templateNameParam ?? tpl?.attributes?.name, `Test #${testIdNum}`].filter(Boolean).join(' - ') || 'Untitled Report';
        try {
            const created = await createReport({ template_id: templateIdNum, patient_id: patientIdNum, hospital_id: hospitalIdNum, user_id: user.id, test_id: testIdNum, title: reportTitle, fields, measurements });
            router.push(created?.data?.id ? `/reports/${created.data.id}?mode=html` : '/reports');
        } catch (e: any) {
            console.error(e);
            const apiErrors = e?.response ? await e.response.json().catch(() => null) : null;
            const errText = apiErrors?.errors ? Object.entries(apiErrors.errors).map(([k,v]:any)=>`${k}: ${(v||[]).join(', ')}`).join(' / ') : 'Unknown error';
            setSubmitError(`Failed to save report: ${errText}`);
        }
    }

    const initialValues = useMemo(() => {
      const patientAttrs = patientRes?.data?.attributes ?? {}; const userAttrs = user ?? {}; const hospitalAttrs = hospital?.attributes ?? {}; const vals: Record<string,string> = {};
      reportFormSections.forEach((sec:any)=> (sec.items??[]).forEach((f:any)=>{ const k=`f_${f.id}`; const dv=f.attributes?.options?.default?String(f.attributes.options.default):''; if(f.attributes?.type==='patient'&&dv.startsWith('patients.')){const a=dv.replace('patients.',''); if(patientAttrs[a]!=null) vals[k]=String(patientAttrs[a]); return;} if(f.attributes?.type==='user'&&dv.startsWith('users.')){const a=dv.replace('users.',''); const v=(userAttrs as any)[a]; if(v!=null) vals[k]=String(v); return;} if(dv) vals[k]=dv; }));
      const labels=new Map<string,string>(); reportFormSections.forEach((s:any)=>s.items.forEach((f:any)=>labels.set(f.attributes.label,`f_${f.id}`)));
      const assign=(l:string,v?:string|null)=>{const k=labels.get(l); if(k&&v) vals[k]=v;}; assign('Hospital Name',hospitalAttrs.name); assign('Address',hospitalAttrs.address); return vals;
    }, [hospital, patientRes, reportFormSections, user]);

    return <div className="space-y-4"><Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' },{ label: 'Reports', href: '/reports' },{ label: 'New Report' }]} />
      <Card><CardHeader><CardTitle>New Report for {name ?? patientRes?.data?.attributes?.name ?? 'Patient'} (Hospital: {hospital?.attributes?.name ?? hospitalName ?? '#'+hospitalId}, Template: {templateNameParam ?? tpl?.attributes?.name ?? '#'+templateId})</CardTitle></CardHeader><CardContent>
        {hasContextError && <div className="rounded-md border border-destructive p-3 text-sm text-destructive">Cannot create report because required context is missing: template/patient/hospital/test.</div>}
        {submitError && <div className="rounded-md border border-destructive p-3 text-sm text-destructive mt-3">{submitError}</div>}
        {isLoading || hospitalLoading || patientLoading ? 'Loading…' : <div className="page-a4 rounded-xl shadow-md"><TemplateFormRenderer groupedSections={reportFormSections} onSubmit={onSubmit} initialValues={initialValues} enableSectionControls showPrintButton /></div>}
      </CardContent></Card></div>;
}

export default function NewReportPage() { return <Suspense fallback={<div className="space-y-4">Loading…</div>}><NewReportPageContent /></Suspense>; }
