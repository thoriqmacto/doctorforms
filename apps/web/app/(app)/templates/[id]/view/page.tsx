'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useParams, useSearchParams } from 'next/navigation';
import { getHospital, getTemplate } from '@/lib/api';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    mockPreviewOperator,
    mockPreviewPatient,
    mockPreviewReport,
    mockPreviewSignatory,
    mockPreviewTest,
} from '@/lib/template-renderer/mockPreviewContext';
import { buildReportRenderPlan, type SectionKind } from '@/lib/template-renderer/renderPlan';
import type { HeaderConfig } from '@/lib/template-renderer/schema';
import {
    DEFAULT_PDF_LAYOUT_CONFIG,
    normalizePdfLayoutConfig,
} from '@/lib/template-renderer/pdfLayoutConfig';

type ViewMode = 'html' | 'pdf' | 'form';

const SUPPORTED_MODES: ViewMode[] = ['html', 'pdf', 'form'];

function normalizeMode(input: string | null): ViewMode {
    if (SUPPORTED_MODES.includes(input as ViewMode)) return input as ViewMode;
    return 'html';
}

function TemplateViewPageContent() {
    const params = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const mode = normalizeMode(searchParams.get('mode'));

    const { data, isLoading } = useSWR(['/templates', params.id, 'view'], () =>
        getTemplate(params.id, { include: 'fields,user,test,hospital' }).then((r: any) => r)
    );

    const tpl = data?.data;
    const included = data?.included ?? [];
    const name = tpl?.attributes?.name ?? 'Template';
    const grouped = tpl?.meta?.grouped_sections ?? [];
    const page = tpl?.meta?.page;

    const userId = tpl?.relationships?.user?.data?.id;
    const testId = tpl?.relationships?.test?.data?.id;
    const hospitalId = tpl?.relationships?.hospital?.data?.id;

    const userAttrs = included.find(
        (item: any) => item.type === 'users' && String(item.id) === String(userId)
    )?.attributes;
    const testAttrs = included.find(
        (item: any) => item.type === 'tests' && String(item.id) === String(testId)
    )?.attributes;
    const userName = userAttrs?.name ?? '';
    const testTypeName = testAttrs?.name ?? '';

    const viewModel = createTemplateViewModel(grouped, name);
    const sectionKinds: Record<string, SectionKind> = {};
    for (const section of grouped as Array<{ section?: string; kind?: string }>) {
        if (section?.section && section?.kind) {
            sectionKinds[section.section] = section.kind as SectionKind;
        }
    }

    const { data: hospitalRes } = useSWR(
        hospitalId ? ['/hospitals', hospitalId] : null,
        () => getHospital(hospitalId as string).then((r: any) => r)
    );

    const includedHospitalAttrs = included.find(
        (item: any) => item.type === 'hospitals' && String(item.id) === String(hospitalId)
    )?.attributes;

    const hospitalAttrs = hospitalRes?.data?.attributes ?? includedHospitalAttrs;

    const headerConfig = (tpl?.attributes?.header_config ?? null) as HeaderConfig | null;
    const layoutConfig = tpl?.attributes?.layout_config
        ? normalizePdfLayoutConfig(tpl.attributes.layout_config)
        : DEFAULT_PDF_LAYOUT_CONFIG;
    const previewOperator = userAttrs
        ? {
              name: userAttrs.name,
              email: userAttrs.email,
              phone: userAttrs.phone,
              position_title: userAttrs.position_title,
          }
        : mockPreviewOperator;
    const previewReport = {
        ...mockPreviewReport,
        title: name,
        operator: userName || mockPreviewReport.operator,
    };
    const previewTest = testTypeName
        ? {
              ...mockPreviewTest,
              name: testTypeName,
          }
        : mockPreviewTest;

    const plan = buildReportRenderPlan({
        viewModel,
        sectionKinds,
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
        headerConfig,
        patient: mockPreviewPatient,
        report: previewReport,
        operator: previewOperator,
        signatory: mockPreviewSignatory,
        test: previewTest,
        testName: testTypeName || mockPreviewTest.name,
    });

    const isHospitalLoading = Boolean(hospitalId) && !hospitalRes;

    const shouldShowHospitalWarning = !isHospitalLoading && (!hospitalId || !hospitalAttrs);

    const pageInfo = page
        ? `${page.size} · ${Number(page.width_mm / 10).toFixed(1)}cm × ${Number(page.height_mm / 10).toFixed(1)}cm`
        : 'Page info unavailable';

    const modeLinks: { label: string; mode: ViewMode }[] = [
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
                    { label: 'Templates', href: '/templates' },
                    { label: name, href: `/templates/${params.id}` },
                    { label: 'View' },
                ]}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold">{name} (View)</h1>
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/templates/${params.id}/edit`}>Edit</Link>
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
                                    <Link href={`/templates/${params.id}/view?mode=${item.mode}`}>{item.label}</Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium text-muted-foreground">{pageInfo}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Preview uses sample patient/report data. Hospital data is from the associated template hospital.
                    </p>
                </CardHeader>
                <CardContent>
                    {isLoading || isHospitalLoading ? (
                        'Loading…'
                    ) : (
                        <div className="space-y-4">
                            {shouldShowHospitalWarning && (
                                <p className="text-sm text-muted-foreground">
                                    Hospital data is not available for this template, so the preview header may be
                                    incomplete.
                                </p>
                            )}
                            {mode === 'html' && <HtmlView plan={plan} layoutConfig={layoutConfig} />}
                            {mode === 'pdf' && (
                                <PdfView
                                    plan={plan}
                                    templateId={params.id}
                                    initialLayoutConfig={layoutConfig}
                                />
                            )}
                            {mode === 'form' && <FormView groupedSections={grouped} />}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


export default function TemplateViewPage() {
    return (
        <Suspense fallback={<div className="space-y-4">Loading…</div>}>
            <TemplateViewPageContent />
        </Suspense>
    );
}
