'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useParams, useSearchParams } from 'next/navigation';
import { getTemplate } from '@/lib/api';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import HtmlView, { type TemplateMeta } from '@/components/template-renderer/HtmlView';
import FormView from '@/components/template-renderer/FormView';
import PdfView from '@/components/template-renderer/PdfView';
import { createTemplateViewModel } from '@/components/template-renderer/TemplateEngine';

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
    const description = tpl?.attributes?.description ?? '';

    const userId = tpl?.relationships?.user?.data?.id;
    const testId = tpl?.relationships?.test?.data?.id;
    const hospitalId = tpl?.relationships?.hospital?.data?.id;

    const userName =
        included.find((item: any) => item.type === 'users' && String(item.id) === String(userId))?.attributes?.name ?? '';
    const testTypeName =
        included.find((item: any) => item.type === 'tests' && String(item.id) === String(testId))?.attributes?.name ?? '';
    const hospitalName =
        included.find((item: any) => item.type === 'hospitals' && String(item.id) === String(hospitalId))?.attributes?.name ?? '';

    const viewModel = createTemplateViewModel(grouped, name);
    const templateMeta: TemplateMeta = {
        title: name,
        description,
        userName,
        testTypeName,
        hospitalName,
    };

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
                    { label: 'Dashboard', href: '/' },
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
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        'Loading…'
                    ) : (
                        <div className="space-y-4">
                            {mode === 'html' && (
                                <HtmlView viewModel={viewModel} templateMeta={templateMeta} />
                            )}
                            {mode === 'pdf' && <PdfView viewModel={viewModel} />}
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
