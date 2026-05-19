'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    DEFAULT_PDF_LAYOUT_CONFIG,
    PDF_LAYOUT_BOUNDS,
    PDF_LAYOUT_PRESETS,
    layoutConfigsEqual,
    normalizePdfLayoutConfig,
    type PdfDensity,
    type PdfLayoutConfig,
} from '@/lib/template-renderer/pdfLayoutConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { saveTemplateLayoutConfig } from '@/lib/api';

type Props = {
    /** Templateid is required to persist; when omitted the panel renders read-only. */
    templateId?: string | number | null;
    /**
     * Live config — owned by the parent so the PDF/HTML preview can
     * re-render every time the user nudges a slider.
     */
    value: PdfLayoutConfig;
    onChange: (next: PdfLayoutConfig) => void;
    /**
     * Server-persisted baseline. The "Reset" button restores this, NOT the
     * factory default. Useful when the user has previously saved a custom
     * layout and just wants to undo unsaved tweaks.
     */
    savedValue: PdfLayoutConfig;
    /** Called after a successful save so the parent can update savedValue. */
    onSaved?: (saved: PdfLayoutConfig) => void;
    disabled?: boolean;
};

type NumberFieldKey =
    | 'page.marginTopMm'
    | 'page.marginRightMm'
    | 'page.marginBottomMm'
    | 'page.marginLeftMm'
    | 'typography.baseFontSizePx'
    | 'typography.smallFontSizePx'
    | 'typography.lineHeight'
    | 'typography.paragraphSpacingPx'
    | 'spacing.sectionGapPx'
    | 'spacing.fieldGapPx'
    | 'spacing.headerGapPx'
    | 'spacing.tableCellPaddingPx';

type FieldSpec = {
    key: NumberFieldKey;
    label: string;
    step: number;
    min: number;
    max: number;
    unit: string;
};

const FIELD_GROUPS: Array<{ heading: string; fields: FieldSpec[] }> = [
    {
        heading: 'Page margins',
        fields: [
            { key: 'page.marginTopMm', label: 'Top', step: 1, min: PDF_LAYOUT_BOUNDS.marginMm.min, max: PDF_LAYOUT_BOUNDS.marginMm.max, unit: 'mm' },
            { key: 'page.marginRightMm', label: 'Right', step: 1, min: PDF_LAYOUT_BOUNDS.marginMm.min, max: PDF_LAYOUT_BOUNDS.marginMm.max, unit: 'mm' },
            { key: 'page.marginBottomMm', label: 'Bottom', step: 1, min: PDF_LAYOUT_BOUNDS.marginMm.min, max: PDF_LAYOUT_BOUNDS.marginMm.max, unit: 'mm' },
            { key: 'page.marginLeftMm', label: 'Left', step: 1, min: PDF_LAYOUT_BOUNDS.marginMm.min, max: PDF_LAYOUT_BOUNDS.marginMm.max, unit: 'mm' },
        ],
    },
    {
        heading: 'Typography',
        fields: [
            { key: 'typography.baseFontSizePx', label: 'Base font size', step: 0.5, min: PDF_LAYOUT_BOUNDS.baseFontSizePx.min, max: PDF_LAYOUT_BOUNDS.baseFontSizePx.max, unit: 'px' },
            { key: 'typography.smallFontSizePx', label: 'Small font size', step: 0.5, min: PDF_LAYOUT_BOUNDS.smallFontSizePx.min, max: PDF_LAYOUT_BOUNDS.smallFontSizePx.max, unit: 'px' },
            { key: 'typography.lineHeight', label: 'Line height', step: 0.05, min: PDF_LAYOUT_BOUNDS.lineHeight.min, max: PDF_LAYOUT_BOUNDS.lineHeight.max, unit: '×' },
            { key: 'typography.paragraphSpacingPx', label: 'Paragraph spacing', step: 1, min: PDF_LAYOUT_BOUNDS.paragraphSpacingPx.min, max: PDF_LAYOUT_BOUNDS.paragraphSpacingPx.max, unit: 'px' },
        ],
    },
    {
        heading: 'Spacing',
        fields: [
            { key: 'spacing.sectionGapPx', label: 'Section gap', step: 1, min: PDF_LAYOUT_BOUNDS.sectionGapPx.min, max: PDF_LAYOUT_BOUNDS.sectionGapPx.max, unit: 'px' },
            { key: 'spacing.fieldGapPx', label: 'Field gap', step: 1, min: PDF_LAYOUT_BOUNDS.fieldGapPx.min, max: PDF_LAYOUT_BOUNDS.fieldGapPx.max, unit: 'px' },
            { key: 'spacing.headerGapPx', label: 'Header gap', step: 1, min: PDF_LAYOUT_BOUNDS.headerGapPx.min, max: PDF_LAYOUT_BOUNDS.headerGapPx.max, unit: 'px' },
            { key: 'spacing.tableCellPaddingPx', label: 'Table cell padding', step: 1, min: PDF_LAYOUT_BOUNDS.tableCellPaddingPx.min, max: PDF_LAYOUT_BOUNDS.tableCellPaddingPx.max, unit: 'px' },
        ],
    },
];

function read(config: PdfLayoutConfig, key: NumberFieldKey): number {
    const [group, field] = key.split('.') as [keyof PdfLayoutConfig['pdf'], string];
    const block = config.pdf[group] as Record<string, unknown>;
    const value = block[field];
    return typeof value === 'number' ? value : 0;
}

function writeNumber(config: PdfLayoutConfig, key: NumberFieldKey, value: number): PdfLayoutConfig {
    const [group, field] = key.split('.') as [keyof PdfLayoutConfig['pdf'], string];
    const next: PdfLayoutConfig = {
        pdf: {
            ...config.pdf,
            [group]: {
                ...(config.pdf[group] as Record<string, unknown>),
                [field]: value,
            },
        },
    } as PdfLayoutConfig;
    // Saving without density would otherwise drift the badge — re-derive
    // it after a manual change so it falls into "custom" when applicable.
    next.pdf.density = detectDensity(next);
    return next;
}

function detectDensity(config: PdfLayoutConfig): PdfDensity {
    for (const candidate of ['compact', 'normal', 'spacious'] as PdfDensity[]) {
        if (layoutConfigsEqual(config, PDF_LAYOUT_PRESETS[candidate])) {
            return candidate;
        }
    }
    return 'normal';
}

function isCustom(config: PdfLayoutConfig): boolean {
    for (const candidate of ['compact', 'normal', 'spacious'] as PdfDensity[]) {
        if (layoutConfigsEqual(config, PDF_LAYOUT_PRESETS[candidate])) {
            return false;
        }
    }
    return true;
}

export default function PdfLayoutPanel({
    templateId,
    value,
    onChange,
    savedValue,
    onSaved,
    disabled,
}: Props) {
    const [saving, setSaving] = useState(false);
    const [open, setOpen] = useState(false);

    const dirty = !layoutConfigsEqual(value, savedValue);
    const matchesFactoryDefault = layoutConfigsEqual(value, DEFAULT_PDF_LAYOUT_CONFIG);
    const customBadge = isCustom(value);

    const summary = useMemo(() => {
        const p = value.pdf;
        return `${p.typography.baseFontSizePx}px · margins ${p.page.marginTopMm}/${p.page.marginRightMm}/${p.page.marginBottomMm}/${p.page.marginLeftMm}mm · gap ${p.spacing.sectionGapPx}px`;
    }, [value]);

    function applyField(key: NumberFieldKey, raw: string) {
        const num = Number(raw);
        if (!Number.isFinite(num)) return;
        const spec = FIELD_GROUPS.flatMap((g) => g.fields).find((f) => f.key === key);
        if (!spec) return;
        const clamped = Math.min(spec.max, Math.max(spec.min, num));
        onChange(writeNumber(value, key, clamped));
    }

    function applyPreset(density: PdfDensity) {
        onChange(PDF_LAYOUT_PRESETS[density]);
    }

    function resetUnsaved() {
        onChange(savedValue);
    }

    function resetToDefault() {
        onChange(DEFAULT_PDF_LAYOUT_CONFIG);
    }

    async function handleSave() {
        if (!templateId) {
            toast.error('Cannot save layout: no template attached to this report.');
            return;
        }
        setSaving(true);
        try {
            const normalized = normalizePdfLayoutConfig(value);
            await saveTemplateLayoutConfig(templateId, normalized);
            onSaved?.(normalized);
            toast.success('PDF layout saved. New reports using this template will use this layout.');
        } catch (err: any) {
            console.error(err);
            try {
                const body = await err?.response?.clone?.().json?.();
                const msg = body?.message ?? 'Failed to save layout.';
                toast.error(msg);
            } catch {
                toast.error('Failed to save layout.');
            }
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="rounded-md border bg-card">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                aria-expanded={open}
            >
                <span className="flex items-center gap-2">
                    <span className="font-medium">PDF Layout Settings</span>
                    <Badge variant={customBadge ? 'outline' : 'secondary'} className="capitalize">
                        {customBadge ? 'Custom' : value.pdf.density}
                    </Badge>
                    {dirty ? <Badge variant="outline">Unsaved</Badge> : null}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                    {summary}
                </span>
            </button>
            {open ? (
                <div className="space-y-4 border-t p-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Preset:</span>
                        {(['compact', 'normal', 'spacious'] as PdfDensity[]).map((density) => (
                            <Button
                                key={density}
                                type="button"
                                size="sm"
                                variant={value.pdf.density === density && !customBadge ? 'secondary' : 'outline'}
                                onClick={() => applyPreset(density)}
                                disabled={disabled}
                                className="capitalize"
                            >
                                {density}
                            </Button>
                        ))}
                    </div>

                    {FIELD_GROUPS.map((group) => (
                        <fieldset key={group.heading} className="space-y-2 rounded-md border p-3">
                            <legend className="px-1 text-xs font-medium text-muted-foreground">
                                {group.heading}
                            </legend>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {group.fields.map((field) => {
                                    const current = read(value, field.key);
                                    return (
                                        <div key={field.key} className="space-y-1">
                                            <Label className="flex items-center justify-between text-xs">
                                                <span>{field.label}</span>
                                                <span className="text-muted-foreground tabular-nums">
                                                    {current}
                                                    {field.unit}
                                                </span>
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="range"
                                                    min={field.min}
                                                    max={field.max}
                                                    step={field.step}
                                                    value={current}
                                                    disabled={disabled}
                                                    onChange={(e) => applyField(field.key, e.target.value)}
                                                    className="h-8 flex-1"
                                                />
                                                <Input
                                                    type="number"
                                                    inputMode="decimal"
                                                    step={field.step}
                                                    min={field.min}
                                                    max={field.max}
                                                    value={current}
                                                    disabled={disabled}
                                                    onChange={(e) => applyField(field.key, e.target.value)}
                                                    className="h-8 w-20 text-right tabular-nums"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </fieldset>
                    ))}

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={resetToDefault}
                            disabled={disabled || matchesFactoryDefault}
                        >
                            Reset to default
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={resetUnsaved}
                            disabled={disabled || !dirty}
                        >
                            Discard changes
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSave}
                            disabled={disabled || saving || !templateId || !dirty}
                        >
                            {saving ? 'Saving…' : 'Save layout'}
                        </Button>
                    </div>
                    {!templateId ? (
                        <p className="text-xs text-muted-foreground">
                            Save is disabled because no template is attached to this preview. The
                            layout below is applied locally only.
                        </p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
