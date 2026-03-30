import type { Field } from '@/components/form/TemplateFormRenderer';

export type TemplateSection = {
    section: string;
    fields: TemplateField[];
};

export type TemplateField = {
    id: string;
    label: string;
    type: Field['attributes']['type'];
    titleTag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    value: string;
    defaultValue: string;
    measurementUnit: string;
    options: string[];
    required: boolean;
    isStatic: boolean;
    style: Record<string, string>;
    textareaMode: 'free' | 'result';
    showSectionName: boolean;
};

export type TemplateViewModel = {
    title: string;
    sections: TemplateSection[];
};

type Section = { section: string | null; items: Field[] };

const SAMPLE_BY_TYPE: Partial<Record<Field['attributes']['type'], string>> = {
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

function extractOptions(field: Field): string[] {
    const raw = field.attributes.options;

    if (Array.isArray(raw)) return raw.map((option) => String(option));
    if (raw && typeof raw === 'object') {
        const maybeOptions = (raw as { options?: unknown }).options;
        if (Array.isArray(maybeOptions)) return maybeOptions.map((option) => String(option));
        const maybeValues = (raw as { values?: unknown }).values;
        if (Array.isArray(maybeValues)) return maybeValues.map((option) => String(option));
    }

    return [];
}

function buildSampleValue(field: Field): string {
    if (field.attributes.type === 'checkbox_group') {
        const options = extractOptions(field);
        return options.slice(0, 2).join(', ') || 'None';
    }

    if (field.attributes.type === 'select') {
        const options = extractOptions(field);
        return options[0] || SAMPLE_BY_TYPE.select || '';
    }

    return SAMPLE_BY_TYPE[field.attributes.type] ?? '—';
}

function isFieldRequired(field: Field): boolean {
    const raw = field.attributes.options;
    return !!raw && typeof raw === 'object' && !Array.isArray(raw) && !!(raw as { required?: unknown }).required;
}

function isStaticField(field: Field): boolean {
    const raw = field.attributes.options;
    return !!raw && typeof raw === 'object' && !Array.isArray(raw) && !!(raw as { static?: unknown }).static;
}

function getDefaultValue(field: Field): string {
    const raw = field.attributes.options;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '';

    const meta = raw as { default?: unknown };
    if (meta.default === null || meta.default === undefined) return '';
    return String(meta.default);
}

function getMeasurementUnit(field: Field): string {
    const raw = field.attributes.options;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '';

    const meta = raw as { measurement_unit?: unknown };
    if (meta.measurement_unit === null || meta.measurement_unit === undefined) return '';
    const measurementUnit = String(meta.measurement_unit).trim();
    if (measurementUnit.toLowerCase() === '[no_uom]') return '';
    return measurementUnit;
}

function getStyle(field: Field): Record<string, string> {
    const raw = field.attributes.options;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

    const meta = raw as { style?: unknown; image_align?: unknown; align?: unknown };
    const styleFromOptions =
        meta.style && typeof meta.style === 'object' && !Array.isArray(meta.style)
            ? Object.fromEntries(Object.entries(meta.style as Record<string, unknown>).map(([k, v]) => [k, String(v)]))
            : {};

    const alignFallback = meta.image_align ?? meta.align;
    if (!alignFallback) return styleFromOptions;

    return {
        ...styleFromOptions,
        align: String(alignFallback).toLowerCase(),
    };
}

function getTextareaMode(field: Field): 'free' | 'result' {
    const raw = field.attributes.options;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'free';
    return (raw as { textarea_mode?: unknown }).textarea_mode === 'result' ? 'result' : 'free';
}

function getTitleTag(field: Field): 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' {
    const raw = field.attributes.options;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'h2';

    const titleTag = (raw as { title_tag?: unknown }).title_tag;
    if (typeof titleTag !== 'string') return 'h2';

    const normalized = titleTag.toLowerCase();
    if (normalized === 'h1' || normalized === 'h2' || normalized === 'h3' || normalized === 'h4' || normalized === 'h5' || normalized === 'h6') {
        return normalized;
    }

    return 'h2';
}

function getShowSectionName(field: Field): boolean {
    const raw = field.attributes.options;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return true;

    const meta = raw as { show_section_name?: unknown; showSectionName?: unknown };
    return !(meta.show_section_name === false || meta.showSectionName === false);
}

export function createTemplateViewModel(
    groupedSections: Section[],
    templateName: string,
    values?: Record<string, unknown>
): TemplateViewModel {
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
                .map((field) => {
                    const fieldKey = `f_${field.id}`;
                    const value = values?.[fieldKey];
                    const options = extractOptions(field);
                    const defaultValue = getDefaultValue(field);
                    const normalizedValue = Array.isArray(value)
                        ? value.join(', ')
                        : value === null || value === undefined || value === ''
                            ? defaultValue || buildSampleValue(field)
                            : String(value);

                    return {
                        id: field.id,
                        label: field.attributes.label,
                        type: field.attributes.type,
                        titleTag: getTitleTag(field),
                        value: normalizedValue,
                        defaultValue,
                        measurementUnit: getMeasurementUnit(field),
                        options,
                        required: isFieldRequired(field),
                        isStatic: isStaticField(field),
                        style: getStyle(field),
                        textareaMode: getTextareaMode(field),
                        showSectionName: getShowSectionName(field),
                    };
                });

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
