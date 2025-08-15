'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getTemplate, createReport, getReport } from '@/lib/api';
import TemplateFormRenderer from '@/components/form/TemplateFormRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateReportPdf } from '@/lib/pdf';

export default function NewReportPage() {
    const sp = useSearchParams();
    const router = useRouter();
    const templateId = sp.get('templateId');
    const patientId = sp.get('patientId');
    const testId = sp.get('testId');
    const hospitalId = sp.get('hospitalId');
    const name = sp.get('name');
    const debug = true;

    const { data, isLoading } = useSWR(
        templateId ? ['/templates', templateId] : null,
        () => getTemplate(templateId!, { include: 'fields' }).then((r: any) => r)
    );

    const tpl = data?.data;
    const grouped = tpl?.meta?.grouped_sections ?? [];

    async function onSubmit(values: Record<string, any>) {
        const payload = {
            template_id: Number(templateId),
            patient_id: Number(patientId),
            hospital_id: Number(hospitalId),
            user_id: 1,
            test_id: Number(testId),
            title: name,
            values,
        };

        // if(debug){
        //     console.log('[DEBUG] createReport payload:', JSON.stringify(payload));
        // }

        try {
            const created: any = await createReport(payload);
            const detail = await getReport(created.data.id, { include: 'patient,fields' });
            await generateReportPdf(detail);
            router.push('/reports');
        } catch (e) {
            console.error(e);
            alert('Failed to save');
        }
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>
                        New Report for {name} (Hospital #{hospitalId}, Template #{templateId})
                    </CardTitle>
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
