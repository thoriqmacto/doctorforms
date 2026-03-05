'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getTemplate } from '@/lib/api';
import TemplateFormRenderer from '@/components/form/TemplateFormRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function TemplateViewPage() {
    const params = useParams<{ id: string }>();
    const { data, isLoading } = useSWR(['/templates', params.id, 'view'], () =>
        getTemplate(params.id, { include: 'fields' }).then((r: any) => r)
    );

    const tpl = data?.data;
    const name = tpl?.attributes?.name ?? 'Template';
    const grouped = tpl?.meta?.grouped_sections ?? [];

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
                <Link href={`/templates/${params.id}/print`}>
                    <Button variant="secondary">Print PDF</Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Rendered Template (HTML)</CardTitle>
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
                                onPrint={() => window.open(`/templates/${params.id}/print`, '_blank')}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
