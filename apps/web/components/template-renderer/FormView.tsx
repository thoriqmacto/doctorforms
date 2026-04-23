import TemplateFormRenderer from '@/components/form/TemplateFormRenderer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Field } from '@/components/form/TemplateFormRenderer';
import type { RenderContexts } from '@/lib/template-renderer/schema';

type Section = { section: string | null; items: Field[] };

type Props = {
    groupedSections: Section[];
    initialValues?: Record<string, unknown>;
    showPrintButton?: boolean;
    editHref?: string;
    viewHref?: string;
    contexts?: RenderContexts;
};

export default function FormView({
    groupedSections,
    initialValues,
    showPrintButton = false,
    editHref,
    viewHref,
    contexts,
}: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Form Input Mode</CardTitle>
                <CardDescription>
                    Compact layout for fast data entry with interactive fields and logical section grouping.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <TemplateFormRenderer
                    groupedSections={groupedSections}
                    onSubmit={() => {}}
                    initialValues={initialValues}
                    showSubmitButton={false}
                    showPrintButton={showPrintButton}
                    editHref={editHref}
                    viewHref={viewHref}
                    enableSectionControls
                    contexts={contexts}
                />
            </CardContent>
        </Card>
    );
}
