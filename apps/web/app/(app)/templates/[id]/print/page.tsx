'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { getTemplate } from '@/lib/api';
import TemplateFormRenderer from '@/components/form/TemplateFormRenderer';

export default function TemplatePrintPage() {
    const params = useParams<{ id: string }>();
    const { data, isLoading } = useSWR(['/templates', params.id, 'print'], () =>
        getTemplate(params.id, { include: 'fields' }).then((r: any) => r)
    );

    const grouped = data?.data?.meta?.grouped_sections ?? [];

    useEffect(() => {
        if (!isLoading && data) {
            const timer = setTimeout(() => window.print(), 150);
            return () => clearTimeout(timer);
        }
    }, [isLoading, data]);

    if (isLoading) return <div className="p-4">Loading…</div>;

    return (
        <main className="p-4 print:p-0">
            <div className="page-a4 mx-auto rounded-xl shadow-md print:shadow-none">
                <TemplateFormRenderer
                    groupedSections={grouped}
                    onSubmit={() => {}}
                    showSubmitButton={false}
                    showPrintButton={false}
                />
            </div>
        </main>
    );
}
