'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReportRenderPlan } from '@/lib/template-renderer/renderPlan';
import { generateTemplatePdf } from '@/lib/pdf';

type Props = {
    plan: ReportRenderPlan;
};

export default function PdfView({ plan }: Props) {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            await generateTemplatePdf(plan);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>PDF View</CardTitle>
                <CardDescription>
                    Uses the same render plan as HTML mode so the two outputs stay visually consistent.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Generate an A4 PDF export rendered from the shared block list.
                </p>
                <Button onClick={handleDownload} disabled={isGenerating}>
                    {isGenerating ? 'Generating PDF…' : 'Download PDF'}
                </Button>
            </CardContent>
        </Card>
    );
}
