'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
    getReport,
    getPatient,
    getHospital,
    getTests,
    getTemplate,
    getUser,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import HtmlView from '@/components/template-renderer/HtmlView';
import FormView from '@/components/template-renderer/FormView';
import PdfView from '@/components/template-renderer/PdfView';
import { createTemplateViewModel } from '@/components/template-renderer/TemplateEngine';
import { buildReportRenderPlan, type SectionKind } from '@/lib/template-renderer/renderPlan';
import type { HeaderConfig, RenderContexts } from '@/lib/template-renderer/schema';
import {
    type ReportViewMode,
    normalizeReportViewMode,
    buildReportModeHref,
} from '@/lib/reportViewModes';

function withoutHeaderSection(sections: any[]) {
    return sections.filter((section) => section?.section?.trim().toLowerCase() !== 'header');
}

function extractSignatoryAttributes(report: any): any | undefined {
    const data = report?.relationships?.signatory?.data;
    if (!data) return undefined;

    // Embedded shape: { type, id, attributes: { ... } }
    if (data.attributes) return data.attributes;

    // JSON:API shape with nested data: { data: { type, id, attributes } }
    if (data.data?.attributes) return data.data.attributes;

    return undefined;
}

export default function ReportDetailPage() {
    const params = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const id = params.id;
    const mode = normalizeReportViewMode(searchParams.get('mode'));

    const { data, isLoading } = useSWR(
        id ? ['/reports', id] : null,
        () => getReport(id, { include: 'fields,template,measurements,signatory' }).then((r: any) => r)
    );

    const report = data?.data;
    const attrs = report?.attributes ?? {};
    const title = attrs.title ?? `Report #${id}`;
    const reportFields = report?.relationships?.fields?.data ?? [];
    const reportMeasurements = report?.relationships?.measurements?.data ?? [];
    const templateId = report?.relationships?.template?.data?.id;

    const { data: templateRes } = useSWR(
        templateId ? ['/templates', templateId] : null,
        () => getTemplate(templateId as string, { include: 'fields' }).then((r: any) => r)
    );
    const template = templateRes?.data;
    const groupedSections = template?.meta?.grouped_sections ?? [];
    const reportFormSections = withoutHeaderSection(groupedSections);

    const patientId = report?.relationships?.patient?.data?.id;
    const hospitalId = report?.relationships?.hospital?.data?.id;
    const testId = report?.relationships?.test?.data?.id;
    const userId = report?.relationships?.user?.data?.id;
    const signatoryAttrs = extractSignatoryAttributes(report);

    const { data: patientRes } = useSWR(
        patientId ? ['/patients', patientId] : null,
        () => getPatient(patientId as string).then((r: any) => r)
    );
    const { data: hospitalRes } = useSWR(
        hospitalId ? ['/hospitals', hospitalId] : null,
        () => getHospital(hospitalId as string).then((r: any) => r)
    );
    const { data: userRes } = useSWR(
        userId ? ['/users', userId] : null,
        () => getUser(userId as string).then((r: any) => r)
    );
    const { data: testsRes } = useSWR(['/tests'], () => getTests().then((r: any) => r));

    const patientName =
        patientRes?.data?.attributes?.name ??
        patientRes?.data?.attributes?.values?.patient_name ??
        '-';
    const hospitalName = hospitalRes?.data?.attributes?.name ?? '-';
    const testName =
        testsRes?.data?.find((t: any) => String(t.id) === String(testId))?.attributes?.name ??
        '-';

    const reportValues = groupedSections.reduce((acc: Record<string, unknown>, section: any) => {
        (section.items ?? []).forEach((field: any) => {
            const fieldKey = `f_${field.id}`;
            if (field.attributes?.type === 'measurement') {
                const measurementName = field.attributes?.options?.measurement_name ?? field.attributes?.label;
                const foundMeasurement = reportMeasurements.find(
                    (measurement: any) => String(measurement.attributes?.name) === String(measurementName)
                );

                if (foundMeasurement?.attributes?.value !== undefined) {
                    acc[fieldKey] = String(foundMeasurement.attributes.value);
                }
                return;
            }

            const foundField = reportFields.find(
                (reportField: any) => String(reportField.template_field_id) === String(field.id)
            );

            if (foundField?.value !== undefined) {
                acc[fieldKey] = String(foundField.value);
            }
        });
        return acc;
    }, {});

    const viewModel = createTemplateViewModel(groupedSections, title, reportValues, {
        fallbackMode: 'empty',
        useDefaultValueForEmpty: false,
    });

    const sectionKinds: Record<string, SectionKind> = {};
    for (const section of groupedSections as Array<{ section?: string; kind?: string }>) {
        if (section?.section && section?.kind) {
            sectionKinds[section.section] = section.kind as SectionKind;
        }
    }

    const hospitalAttrs = hospitalRes?.data?.attributes;
    const patientAttrs = patientRes?.data?.attributes;
    const userAttrs = userRes?.data?.attributes;
    const headerConfig = (template?.attributes?.header_config ?? null) as HeaderConfig | null;

    const renderContexts: RenderContexts = {
        hospital: hospitalAttrs
            ? {
                  name: hospitalAttrs.name,
                  short_name: hospitalAttrs.short_name,
                  parent_org_line: hospitalAttrs.parent_org_line,
                  address: hospitalAttrs.address,
                  address_line_1: hospitalAttrs.address_line_1,
                  address_line_2: hospitalAttrs.address_line_2,
                  province: hospitalAttrs.province,
                  city: hospitalAttrs.city,
                  postal_code: hospitalAttrs.postal_code,
                  country: hospitalAttrs.country,
                  phone: hospitalAttrs.phone,
                  fax: hospitalAttrs.fax,
                  whatsapp_phone: hospitalAttrs.whatsapp_phone,
                  email: hospitalAttrs.email,
                  website: hospitalAttrs.website,
                  logo_url: hospitalAttrs.logo_url,
                  secondary_logo_url: hospitalAttrs.secondary_logo_url,
                  accreditation_text: hospitalAttrs.accreditation_text,
                  report_footer_line: hospitalAttrs.report_footer_line,
              }
            : undefined,
        patient: patientAttrs
            ? {
                  name: patientAttrs.name,
                  mrn: patientAttrs.mrn,
                  gender: patientAttrs.gender,
                  dob: patientAttrs.dob,
                  age: patientAttrs.age,
                  dos: patientAttrs.dos,
                  height_cm: patientAttrs.height_cm,
                  weight_kg: patientAttrs.weight_kg,
                  bsa: patientAttrs.bsa,
                  blood_pressure: patientAttrs.blood_pressure,
                  diagnosis_brief: patientAttrs.diagnosis_brief,
                  referring_physician: patientAttrs.referring_physician,
              }
            : undefined,
        user: userAttrs
            ? {
                  name: userAttrs.name,
                  email: userAttrs.email,
                  phone: userAttrs.phone,
                  position_title: userAttrs.position_title,
              }
            : undefined,
        report: {
            title: attrs.title,
            findings: attrs.findings,
            conclusion: attrs.conclusion,
            operator: attrs.operator,
            supervisor: attrs.supervisor,
            device: attrs.device,
        },
        signatory: signatoryAttrs,
        test: {
            name: testName !== '-' ? testName : undefined,
        },
    };

    const plan = buildReportRenderPlan({
        viewModel,
        sectionKinds,
        hospital: renderContexts.hospital,
        patient: renderContexts.patient,
        operator: renderContexts.user,
        signatory: renderContexts.signatory,
        test: renderContexts.test,
        report: renderContexts.report,
        headerConfig,
        testName,
    });
    const modeLinks: { label: string; mode: ReportViewMode }[] = [
        { label: 'HTML View', mode: 'html' },
        { label: 'PDF View', mode: 'pdf' },
        { label: 'Form View', mode: 'form' },
    ];
    const currentModeLabel = modeLinks.find((item) => item.mode === mode)?.label ?? 'Select View';

    return (
        <div className="space-y-4">
            <Breadcrumbs
                items={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Reports', href: '/reports' },
                    { label: title },
                ]}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold">{title}</h1>
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/reports/${id}/edit`}>Edit</Link>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                {currentModeLabel}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {modeLinks.map((item) => (
                                <DropdownMenuItem key={item.mode} asChild>
                                    <Link href={buildReportModeHref(id, item.mode)}>{item.label}</Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            {isLoading ? (
                'Loading…'
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {title} · {patientName} · {testName} · {hospitalName}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {mode === 'html' && <HtmlView plan={plan} />}
                            {mode === 'pdf' && <PdfView plan={plan} />}
                            {mode === 'form' && (
                                <FormView
                                    groupedSections={reportFormSections}
                                    initialValues={reportValues}
                                    showPrintButton
                                    editHref={`/reports/${id}/edit`}
                                    contexts={renderContexts}
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
