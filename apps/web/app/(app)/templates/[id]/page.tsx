'use client';

import useSWR from 'swr';
import { getTemplate } from '@/lib/api';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function TemplateDetailPage() {
    const params = useParams<{ id: string }>();
    const sp = useSearchParams();
    const patientId = sp.get('patientId');
    const testId = sp.get('testId');
    const { data, isLoading } = useSWR(['/templates', params.id], () =>
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
                    { label: name },
                ]}
            />
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">{name}</h1>
                <div className="space-x-2">
                    <Link href={`/templates/${params.id}/edit`}>
                        <Button variant="secondary">Edit Template</Button>
                    </Link>
                    <Link
                        href={`/reports/new?templateId=${params.id}${testId ? `&testId=${testId}` : ''}${patientId ? `&patientId=${patientId}` : ''}`}
                    >
                        <Button>Use This Template</Button>
                    </Link>
                </div>
            </div>

            {isLoading ? 'Loading…' : (
                <Card>
                    <CardHeader>
                        <CardTitle>Sections</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {grouped.map((sec: any) => (
                            <div key={sec.section}>
                                <h2 className="text-lg font-medium mb-2">{sec.section}</h2>
                                <ul className="space-y-1 list-disc list-inside">
                                    {sec.items.map((f: any) => (
                                        <li key={f.id}>
                                            <span className="font-medium">{f.attributes.label}</span>
                                            <span className="text-muted-foreground"> — {f.attributes.type}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
