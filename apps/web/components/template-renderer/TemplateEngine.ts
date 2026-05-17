import type { Field } from '@/components/form/TemplateFormRenderer';
import {
    parseFieldOptions,
    resolveBinding,
    type Binding,
    type FieldOptions,
    type FieldStyle,
    type FieldType,
    type RenderContexts,
} from '@/lib/template-renderer/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TemplateSection = {
    section: string;
    fields: TemplateField[];
};

export type TemplateField = {
    id: string;
    label: string;
    type: FieldType;
    titleTag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    value: string;
    defaultValue: string;
    measurementUnit: string;
    options: string[];
    required: boolean;
    isStatic: boolean;
    style: FieldStyle;
    textareaMode: 'free' | 'result';
    showSectionName: boolean;
    /** Present when the field carries options.binding. Used by renderPlan. */
    binding?: Binding;
    extraTextareaEnabled: boolean;
    extraTextareaLabel: string;
    extraTextareaEmphasis: 'normal' | 'italic' | 'bold' | 'muted';
};

export type TemplateViewModel = {
    title: string;
    sections: TemplateSection[];
};

type Section = { section: string | null; items: Field[] };
type CreateTemplateViewModelOptions = {
    fallbackMode?: 'sample' | 'empty';
    useDefaultValueForEmpty?: boolean;
    /**
     * When provided, fields carrying a binding resolve to the entity value
     * here rather than relying on the caller-injected reportField value.
     * This is what lets `type: 'patient'` with `binding.path: 'dob'` show
     * the actual patient DOB in form/HTML/PDF views.
     */
    contexts?: RenderContexts;
};

// ---------------------------------------------------------------------------
// Sample value fallbacks (used only in template-preview mode)
// ---------------------------------------------------------------------------

const SAMPLE_BY_TYPE: Partial<Record<FieldType, string>> = {
    text: 'Normal findings',
    number: '42',
    select: 'Selected option',
    textarea: 'No pericardial effusion. Left ventricular systolic function preserved.',
    date: new Date().toISOString().slice(0, 10),
    patient: 'John Doe',
    user: 'Dr. Smith',
    measurement: '3.4 cm',
    bullseye: 'https://example.com/mock-bullseye.png',
    image: 'https://example.com/mock-image.png',
    title: '',
};

function buildSampleValue(field: Field, options: FieldOptions): string {
    if (field.attributes.type === 'checkbox_group') {
        return options.values.slice(0, 2).join(', ') || 'None';
    }

    if (field.attributes.type === 'select') {
        return options.values[0] || SAMPLE_BY_TYPE.select || '';
    }

    return SAMPLE_BY_TYPE[field.attributes.type] ?? '—';
}

// ---------------------------------------------------------------------------
// Main transform: grouped_sections → TemplateViewModel
// ---------------------------------------------------------------------------

export function createTemplateViewModel(
    groupedSections: Section[],
    templateName: string,
    values?: Record<string, unknown>,
    opts?: CreateTemplateViewModelOptions
): TemplateViewModel {
    const fallbackMode = opts?.fallbackMode ?? 'sample';
    const useDefaultValueForEmpty = opts?.useDefaultValueForEmpty ?? true;
    const contexts = opts?.contexts;

    const sections = groupedSections
        .slice()
        .sort((a, b) => {
            const aOrder = Math.min(...a.items.map((item) => item.attributes.field_group_order ?? Number.POSITIVE_INFINITY));
            const bOrder = Math.min(...b.items.map((item) => item.attributes.field_group_order ?? Number.POSITIVE_INFINITY));
            if (aOrder !== bOrder) return aOrder - bOrder;

            return (a.section ?? '').localeCompare(b.section ?? '');
        })
        .map((section, sectionIndex) => {
            const sectionName = section.section?.trim() || `Section ${sectionIndex + 1}`;
            const fields = section.items
                .sort((a, b) => (a.attributes.order ?? 0) - (b.attributes.order ?? 0))
                .map((field) => buildTemplateField(field, values, fallbackMode, useDefaultValueForEmpty, contexts));

            return {
                section: sectionName,
                fields,
            };
        })
        .filter((section) => section.fields.length > 0);

    return {
        title: templateName,
        sections,
    };
}

// ---------------------------------------------------------------------------
// Single-field transform
// ---------------------------------------------------------------------------

function buildTemplateField(
    field: Field,
    values: Record<string, unknown> | undefined,
    fallbackMode: 'sample' | 'empty',
    useDefaultValueForEmpty: boolean,
    contexts: RenderContexts | undefined
): TemplateField {
    const parsed = parseFieldOptions(field.attributes.options);
    const fieldKey = `f_${field.id}`;
    const reportValue = values?.[fieldKey];

    // Binding resolution takes priority for bound fields: we want the real
    // entity value to show up in HTML/PDF even if the report row never
    // stored anything (the binding is the source of truth).
    const boundValue = resolveBinding(parsed.binding, contexts ?? {});

    const normalizedFromValue = Array.isArray(reportValue)
        ? reportValue.join(', ')
        : reportValue === null || reportValue === undefined || reportValue === ''
          ? undefined
          : String(reportValue);

    const normalizedValue =
        boundValue !== undefined
            ? boundValue
            : normalizedFromValue !== undefined
              ? normalizedFromValue
              : (useDefaultValueForEmpty ? parsed.default : '') ||
                (fallbackMode === 'sample' ? buildSampleValue(field, parsed) : '');

    return {
        id: field.id,
        label: field.attributes.label,
        type: field.attributes.type as FieldType,
        titleTag: parsed.titleTag,
        value: normalizedValue,
        defaultValue: parsed.default,
        measurementUnit: cleanMeasurementUnit(parsed.measurementUnit),
        options: parsed.values,
        required: parsed.required,
        isStatic: parsed.static,
        style: parsed.style,
        textareaMode: parsed.textareaMode,
        showSectionName: parsed.showSectionName,
        binding: parsed.binding,
        extraTextareaEnabled: parsed.extraTextareaEnabled,
        extraTextareaLabel: parsed.extraTextareaLabel || 'Additional note',
        extraTextareaEmphasis: parsed.extraTextareaEmphasis,
    };
}

function cleanMeasurementUnit(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (trimmed.toLowerCase() === '[no_uom]') return '';
    return trimmed;
}
