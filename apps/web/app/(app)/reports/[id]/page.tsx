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
import {
    type ReportViewMode,
    normalizeReportViewMode,
    buildReportModeHref,
} from '@/lib/reportViewModes';

function withoutHeaderSection(sections: any[]) {
    return sections.filter((section) => section?.section?.trim().toLowerCase() !== 'header');
}

export default function ReportDetailPage() {
    const params = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const id = params.id;
    const mode = normalizeReportViewMode(searchParams.get('mode'));

    const { data, isLoading } = useSWR(
        id ? ['/reports', id] : null,
        () => getReport(id, { include: 'fields,template,measurements' }).then((r: any) => r)
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

    const { data: patientRes } = useSWR(
        patientId ? ['/patients', patientId] : null,
        () => getPatient(patientId as string).then((r: any) => r)
    );
    const { data: hospitalRes } = useSWR(
        hospitalId ? ['/hospitals', hospitalId] : null,
        () => getHospital(hospitalId as string).then((r: any) => r)
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
                            {mode === 'html' && <HtmlView viewModel={viewModel} />}
                            {mode === 'pdf' && <PdfView viewModel={viewModel} />}
                            {mode === 'form' && (
                                <FormView
                                    groupedSections={reportFormSections}
                                    initialValues={reportValues}
                                    showPrintButton
                                    editHref={`/reports/${id}/edit`}
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
