'use client';

import type { PatientContext } from '@/lib/template-renderer/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type GroupedSection = {
    section: string | null;
    items: Array<{
        id: string;
        attributes: {
            type: string;
            label: string;
            options?: Record<string, unknown> | string[] | null;
        };
    }>;
};

type PanelProps = {
    open: boolean;
    onClose: () => void;
    patient: PatientContext | undefined;
    /** Grouped sections (header excluded) from the report's template. */
    groupedSections: GroupedSection[];
    /** Hydrated/current form values keyed by `f_<fieldId>`. */
    formValues?: Record<string, unknown>;
};

type ToggleProps = {
    open: boolean;
    onToggle: () => void;
};

const PATIENT_BASICS_LABEL: Array<{ key: keyof PatientContext; label: string; suffix?: string }> = [
    { key: 'name', label: 'Name' },
    { key: 'mrn', label: 'MRN' },
    { key: 'gender', label: 'Gender' },
    { key: 'age', label: 'Age', suffix: ' y.o' },
    { key: 'dob', label: 'DOB' },
    { key: 'height_cm', label: 'Height', suffix: ' cm' },
    { key: 'weight_kg', label: 'Weight', suffix: ' kg' },
    { key: 'bsa', label: 'BSA', suffix: ' m²' },
    { key: 'blood_pressure', label: 'BP' },
];

function fmt(value: unknown): string {
    if (value === null || value === undefined) return '';
    const s = typeof value === 'string' ? value : String(value);
    return s.trim();
}

function isMeasurementField(field: GroupedSection['items'][number]): boolean {
    return field.attributes?.type === 'measurement';
}

/**
 * Sticky reference card. Controlled — parent owns the open state so the
 * toggle button can sit in the form's sticky toolbar.
 */
export default function ReportMeasurementReferencePanel({
    open,
    onClose,
    patient,
    groupedSections,
    formValues,
}: PanelProps) {
    const measurementSections = (groupedSections ?? []).flatMap((section) => {
        const measurements = (section.items ?? []).filter(isMeasurementField);
        if (measurements.length === 0) return [];
        return [{ section: section.section ?? '', items: measurements }];
    });

    const hasPatientBasics = !!patient && PATIENT_BASICS_LABEL.some(({ key }) => fmt(patient[key]));
    const hasMeasurements = measurementSections.length > 0;

    if (!open) return null;
    if (!hasPatientBasics && !hasMeasurements) return null;

    return (
        <aside
            className="fixed right-4 top-20 z-[9999] w-[min(420px,calc(100vw-2rem))] print:hidden"
            data-component="report-measurement-reference"
        >
            <Card className="max-h-[calc(100vh-6rem)] overflow-y-auto bg-background/95 shadow-2xl backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm">Patient reference</CardTitle>
                    <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Hide measurements">
                        Hide
                    </Button>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                    {hasPatientBasics ? (
                        <section className="space-y-1">
                            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Patient
                            </h4>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                {PATIENT_BASICS_LABEL.map(({ key, label, suffix }) => {
                                    const raw = patient ? fmt(patient[key]) : '';
                                    if (!raw) return null;
                                    return (
                                        <div key={String(key)} className="flex items-baseline justify-between gap-2">
                                            <span className="text-muted-foreground">{label}</span>
                                            <span className="font-medium text-right">
                                                {raw}{suffix ?? ''}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ) : null}
                    {measurementSections.map(({ section, items }) => (
                        <section key={section} className="space-y-1">
                            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {section || 'Measurements'}
                            </h4>
                            <div className="space-y-0.5">
                                {items.map((field) => {
                                    const opts = (field.attributes?.options ?? {}) as Record<string, unknown>;
                                    const unit =
                                        typeof opts.measurement_unit === 'string' ? opts.measurement_unit : '';
                                    const formKey = `f_${field.id}`;
                                    const current = fmt(formValues?.[formKey]);
                                    return (
                                        <div
                                            key={field.id}
                                            className="flex items-baseline justify-between gap-2"
                                        >
                                            <span className="text-muted-foreground">
                                                {field.attributes?.label || `Field #${field.id}`}
                                            </span>
                                            <span className="font-medium text-right">
                                                {current || '—'}
                                                {current && unit ? ` ${unit}` : ''}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </CardContent>
            </Card>
        </aside>
    );
}

/**
 * Companion button for the renderer's sticky toolbar. Renders nothing
 * when there's nothing to show, so consumer pages don't have to repeat
 * the gating logic.
 */
export function ReportMeasurementReferenceToggle({ open, onToggle }: ToggleProps) {
    return (
        <Button
            type="button"
            size="sm"
            variant={open ? 'secondary' : 'outline'}
            onClick={onToggle}
            aria-expanded={open}
            className="shrink-0"
        >
            {open ? 'Hide measurements' : 'Show measurements'}
        </Button>
    );
}
