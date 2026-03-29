'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { TemplateViewModel } from '@/components/template-renderer/TemplateEngine';
import { generateTemplatePdf } from '@/lib/pdf';

type Props = {
    viewModel: TemplateViewModel;
};

export default function PdfView({ viewModel }: Props) {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            await generateTemplatePdf(viewModel);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>PDF View</CardTitle>
                <CardDescription>
                    Uses the same TemplateEngine content as HTML mode to preserve structure and layout fidelity.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Generate an A4 PDF export rendered from the HTML source model.
                </p>
                <Button onClick={handleDownload} disabled={isGenerating}>
                    {isGenerating ? 'Generating PDF…' : 'Download PDF'}
                </Button>
            </CardContent>
        </Card>
    );
}
