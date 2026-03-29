import TemplateFormRenderer from '@/components/form/TemplateFormRenderer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Field } from '@/components/form/TemplateFormRenderer';

type Section = { section: string | null; items: Field[] };

type Props = {
    groupedSections: Section[];
};

export default function FormView({ groupedSections }: Props) {
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
                    showSubmitButton={false}
                    showPrintButton={false}
                    enableSectionControls
                />
            </CardContent>
        </Card>
    );
}
