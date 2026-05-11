'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { createReport, getHospital, getPatient, getTemplate, getTest } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import Breadcrumbs from '@/components/Breadcrumbs';
import TemplateFormRenderer from '@/components/form/TemplateFormRenderer';
import SignatorySelector from '@/components/form/SignatorySelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const toValidId = (value: string | null) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function NewReportPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [signatoryId, setSignatoryId] = useState<number | null>(null);

  const templateIdNum = toValidId(sp.get('templateId'));
  const patientIdNum = toValidId(sp.get('patientId'));
  const hospitalIdFromUrl = toValidId(sp.get('hospitalId'));
  const testIdFromUrl = toValidId(sp.get('testId'));

  const name = sp.get('name');
  const hospitalName = sp.get('hospitalName');
  const templateNameParam = sp.get('templateName');
  const testCodeParam = sp.get('testCode');

  const { data: templateRes, isLoading: templateLoading } = useSWR(
    templateIdNum ? ['/templates', templateIdNum] : null,
    () => getTemplate(templateIdNum!, { include: 'fields' }),
  );

  const template = templateRes?.data;
  const derivedHospitalId = hospitalIdFromUrl ?? toValidId(template?.relationships?.hospital?.data?.id ?? null);
  const derivedTestId = testIdFromUrl ?? toValidId(template?.relationships?.test?.data?.id ?? null);

  const { data: hospitalRes, isLoading: hospitalLoading } = useSWR(
    derivedHospitalId ? ['/hospitals', derivedHospitalId] : null,
    () => getHospital(derivedHospitalId!),
  );
  const { data: patientRes, isLoading: patientLoading } = useSWR(
    patientIdNum ? ['/patients', patientIdNum] : null,
    () => getPatient(patientIdNum!),
  );
  const { data: testRes } = useSWR(
    derivedTestId ? ['/tests', derivedTestId] : null,
    () => getTest(derivedTestId!),
  );

  const groupedSections = useMemo(() => template?.meta?.grouped_sections ?? [], [template]);
  const reportFormSections = useMemo(
    () => groupedSections.filter((section: any) => section?.section?.trim().toLowerCase() !== 'header'),
    [groupedSections],
  );

  const missingContext = [
    !templateIdNum ? 'templateId' : null,
    !patientIdNum ? 'patientId' : null,
    !derivedHospitalId ? 'hospitalId' : null,
    !derivedTestId ? 'testId' : null,
  ].filter(Boolean) as string[];

  const hasContextError = missingContext.length > 0;
  const isAdmin = user?.role === 'admin';
  const templateDisabled = template?.attributes?.is_enabled === false;
  const templateBlocked = templateDisabled && !isAdmin;

  async function onSubmit(values: Record<string, any>) {
    setSubmitError(null);

    if (!user?.id) {
      setSubmitError('Cannot save report because authenticated user is unavailable.');
      return;
    }

    if (!patientIdNum) {
      setSubmitError('Please return to Reports and select a patient before creating a report.');
      return;
    }

    if (templateBlocked) {
      setSubmitError(
        'Selected template is disabled. Ask an administrator to enable it before creating a new report.',
      );
      return;
    }

    if (hasContextError) {
      setSubmitError(
        `Cannot create report because required context is missing: ${missingContext.join(', ')}.`,
      );
      return;
    }

    const fields: any[] = [];
    const measurements: any[] = [];

    reportFormSections.forEach((section: any) => {
      (section.items ?? []).forEach((field: any) => {
        const rawValue = values[`f_${field.id}`];
        const normalizedValue = Array.isArray(rawValue)
          ? rawValue.join(', ')
          : rawValue && typeof rawValue === 'object'
            ? JSON.stringify(rawValue)
            : rawValue;

        if (normalizedValue === undefined || normalizedValue === null || String(normalizedValue).trim() === '') {
          return;
        }

        const options = field.attributes?.options ?? {};
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

    const testCode = (testCodeParam ?? testRes?.data?.attributes?.code ?? '').trim();
    const patientName = (patientRes?.data?.attributes?.name ?? '').trim();
    const canonicalTitle = testCode && patientName ? `${testCode} Report - ${patientName}` : '';

    const reportTitle =
      canonicalTitle ||
      name?.trim() ||
      patientName ||
      [templateNameParam ?? template?.attributes?.name, `Test #${derivedTestId}`].filter(Boolean).join(' - ') ||
      'Untitled Report';

    try {
      const created = await createReport({
        template_id: templateIdNum,
        patient_id: patientIdNum,
        hospital_id: derivedHospitalId,
        test_id: derivedTestId,
        user_id: user.id,
        signatory_id: signatoryId,
        title: reportTitle,
        // Operator defaults to the logged-in user's name. Backend also
        // auto-fills if this is omitted, but sending it here keeps the
        // created report consistent with what we render on the edit form.
        operator: typeof user.name === 'string' ? user.name : undefined,
        fields,
        measurements,
      });
      router.push(created?.data?.id ? `/reports/${created.data.id}?mode=html` : '/reports');
    } catch (error: any) {
      console.error(error);
      const apiErrors = error?.response ? await error.response.json().catch(() => null) : null;
      const errText = apiErrors?.errors
        ? Object.entries(apiErrors.errors)
            .map(([key, value]: any) => `${key}: ${(value || []).join(', ')}`)
            .join(' / ')
        : 'Unknown error';
      setSubmitError(`Failed to save report: ${errText}`);
    }
  }

  const initialValues = useMemo(() => {
    const patientAttrs = patientRes?.data?.attributes ?? {};
    const userAttrs = user ?? {};
    const hospitalAttrs = hospitalRes?.data?.attributes ?? {};
    const values: Record<string, string> = {};

    reportFormSections.forEach((section: any) => {
      (section.items ?? []).forEach((field: any) => {
        const key = `f_${field.id}`;
        const defaultValue = field.attributes?.options?.default ? String(field.attributes.options.default) : '';

        if (field.attributes?.type === 'patient' && defaultValue.startsWith('patients.')) {
          const attr = defaultValue.replace('patients.', '');
          if (patientAttrs[attr] != null) values[key] = String(patientAttrs[attr]);
          return;
        }

        if (field.attributes?.type === 'user' && defaultValue.startsWith('users.')) {
          const attr = defaultValue.replace('users.', '');
          const val = (userAttrs as any)[attr];
          if (val != null) values[key] = String(val);
          return;
        }

        if (defaultValue) values[key] = defaultValue;
      });
    });

    const labels = new Map<string, string>();
    reportFormSections.forEach((section: any) => {
      (section.items ?? []).forEach((field: any) => {
        labels.set(field.attributes.label, `f_${field.id}`);
      });
    });

    const assignLabel = (label: string, val?: string | null) => {
      const key = labels.get(label);
      if (key && val) values[key] = val;
    };

    assignLabel('Hospital Name', hospitalAttrs.name);
    assignLabel('Address', hospitalAttrs.address);

    return values;
  }, [hospitalRes, patientRes, reportFormSections, user]);

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reports', href: '/reports' }, { label: 'New Report' }]} />
      <Card>
        <CardHeader>
          <CardTitle>
            New Report for {name ?? patientRes?.data?.attributes?.name ?? 'Patient'} (Hospital:{' '}
            {hospitalRes?.data?.attributes?.name ?? hospitalName ?? (derivedHospitalId ? `#${derivedHospitalId}` : '-')}, Template:{' '}
            {templateNameParam ?? template?.attributes?.name ?? (templateIdNum ? `#${templateIdNum}` : '-')})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasContextError && (
            <div className="rounded-md border border-destructive p-3 text-sm text-destructive">
              Cannot create report because required context is missing: {missingContext.join(', ')}.
            </div>
          )}
          {!patientIdNum && name && (
            <div className="mt-3 rounded-md border border-destructive p-3 text-sm text-destructive">
              Patient ID is required. Please return to Reports and select a patient.
            </div>
          )}
          {templateBlocked && (
            <div className="mt-3 rounded-md border border-destructive p-3 text-sm text-destructive">
              Selected template is disabled. Ask an administrator to enable it before creating a new report.
            </div>
          )}
          {submitError && (
            <div className="mt-3 rounded-md border border-destructive p-3 text-sm text-destructive">
              {submitError}
            </div>
          )}
          {templateLoading || hospitalLoading || patientLoading ? (
            'Loading…'
          ) : (
            <div className="space-y-4">
              <div className="page-a4 rounded-xl shadow-md">
                <TemplateFormRenderer
                  groupedSections={reportFormSections}
                  onSubmit={onSubmit}
                  initialValues={initialValues}
                  enableSectionControls
                  showPrintButton
                />
              </div>
              <SignatorySelector
                hospitalId={derivedHospitalId}
                value={signatoryId}
                onChange={setSignatoryId}
                patientUserId={patientRes?.data?.relationships?.user?.data?.id
                  ? Number(patientRes.data.relationships.user.data.id)
                  : null}
                helperText="The selected doctor's signature will be embedded into the report header/footer."
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
