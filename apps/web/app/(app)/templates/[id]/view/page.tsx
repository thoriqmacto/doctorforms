'use client';

import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { getTemplate } from '@/lib/api';
import TemplateFormRenderer from '@/components/form/TemplateFormRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function TemplateViewPage() {
    const params = useParams<{ id: string }>();
    const { data, isLoading } = useSWR(['/templates', params.id, 'view'], () =>
        getTemplate(params.id, { include: 'fields' }).then((r: any) => r)
    );

    const tpl = data?.data;
    const name = tpl?.attributes?.name ?? 'Template';
    const grouped = tpl?.meta?.grouped_sections ?? [];
    const page = tpl?.meta?.page;

    const pageInfo = page
        ? `${page.size} · ${Number(page.width_mm / 10).toFixed(1)}cm × ${Number(page.height_mm / 10).toFixed(1)}cm`
        : 'Page info unavailable';

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
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">{name} (View)</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium text-muted-foreground">{pageInfo}</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        'Loading…'
                    ) : (
                        <div className="page-a4 rounded-xl shadow-md">
                            <TemplateFormRenderer
                                groupedSections={grouped}
                                onSubmit={() => {}}
                                showSubmitButton={false}
                                hideStaticRequiredLabelAndInput
                                onPrint={() => window.open(`/templates/${params.id}/print`, '_blank')}
                                enableSectionControls
                                editHref={`/templates/${params.id}/edit`}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
