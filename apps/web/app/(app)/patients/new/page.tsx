'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getTemplate, createPatient } from '@/lib/api';
import TemplateFormRenderer from '@/components/form/TemplateFormRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewPatientPage() {
    const sp = useSearchParams();
    const router = useRouter();
    const templateId = sp.get('templateId');
    const testId = sp.get('testId');

    const { data, isLoading } = useSWR(
        templateId ? ['/templates', templateId] : null,
        () => getTemplate(templateId!, { include: 'fields' })
    );

    const tpl = (data as any)?.data;
    const grouped = tpl?.meta?.grouped_sections ?? [];

    async function onSubmit(values: Record<string, unknown>) {
        // Map to your backend payload (adjust IDs according to your seeder relations)
        const payload: Record<string, unknown> = {
            template_id: Number(templateId),
            hospital_id: 1,
            user_id: 1,
            test_id: Number(testId),
            values,
        };

        try {
            await createPatient(payload);
            router.push('/patients');
        } catch (e) {
            console.error(e);
            alert('Failed to save');
        }
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>New Patient (Template #{templateId})</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? 'Loading…' : (
                        <div className="page-a4 rounded-xl shadow-md">
                            <TemplateFormRenderer groupedSections={grouped} onSubmit={onSubmit} />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
