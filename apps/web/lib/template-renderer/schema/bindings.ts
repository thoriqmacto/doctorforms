/**
 * Entity binding catalog — the web half of the contract enforced by
 * apps/api/app/Support/EntityBindingCatalog.php. Adding a new path here
 * but not on the backend (or vice versa) is a bug.
 *
 * Responsibility: given a `Binding` and a bag of `RenderContexts`,
 * return the raw string value to display. No formatting happens here
 * beyond trivial coercion — format-specific concerns stay in renderPlan.
 */

import type { Binding, BindingSource, RenderContexts } from './types';

type CatalogEntry = {
    paths: string[];
    label: string;
};

export const ENTITY_BINDING_CATALOG: Record<Exclude<BindingSource, 'literal'>, CatalogEntry> = {
    hospital: {
        label: 'Hospital',
        paths: [
            'name',
            'short_name',
            'parent_org_line',
            'address',
            'address_line_1',
            'address_line_2',
            'province',
            'city',
            'postal_code',
            'country',
            'phone',
            'fax',
            'whatsapp_phone',
            'email',
            'website',
            'logo_url',
            'secondary_logo_url',
            'accreditation_text',
            'report_footer_line',
        ],
    },
    patient: {
        label: 'Patient',
        paths: [
            'name',
            'mrn',
            'gender',
            'dob',
            'dos',
            'age',
            'height_cm',
            'weight_kg',
            'bsa',
            'blood_pressure',
            'diagnosis_brief',
            'referring_physician',
        ],
    },
    user: {
        label: 'User / Doctor',
        paths: ['name', 'email', 'phone', 'position_title'],
    },
    report: {
        label: 'Report',
        paths: ['title', 'findings', 'conclusion', 'operator', 'supervisor', 'device'],
    },
    signatory: {
        label: 'Signatory',
        paths: ['name', 'position_title', 'sip_number', 'signature_image_url'],
    },
    test: {
        label: 'Test / Study',
        paths: ['code', 'name', 'type', 'description'],
    },
};

export function isValidBindingPath(source: BindingSource, path: string): boolean {
    if (source === 'literal') return false;
    const entry = ENTITY_BINDING_CATALOG[source];
    return !!entry && entry.paths.includes(path);
}

export function bindingSources(): Array<Exclude<BindingSource, 'literal'>> {
    return Object.keys(ENTITY_BINDING_CATALOG) as Array<Exclude<BindingSource, 'literal'>>;
}

export function bindingPathsFor(source: Exclude<BindingSource, 'literal'>): string[] {
    return ENTITY_BINDING_CATALOG[source]?.paths ?? [];
}

/**
 * Resolve a binding to its string value using the injected contexts.
 * Returns `undefined` when the context for the source is missing; callers
 * decide whether to fall back to the field's default or show an em-dash.
 */
export function resolveBinding(
    binding: Binding | undefined,
    contexts: RenderContexts
): string | undefined {
    if (!binding) return undefined;

    if (binding.source === 'literal') {
        return binding.value;
    }

    const contextMap: Record<Exclude<BindingSource, 'literal'>, unknown> = {
        hospital: contexts.hospital,
        patient: contexts.patient,
        user: contexts.user,
        report: contexts.report,
        signatory: contexts.signatory,
        test: contexts.test,
    };

    const context = contextMap[binding.source] as Record<string, unknown> | undefined;
    if (!context) return undefined;

    const value = context[binding.path];
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value;
    return String(value);
}


export function resolveTemplateString(template: string, contexts: RenderContexts): string {
    const resolved = template.replace(/{{\s*([a-zA-Z_]+)\.([a-zA-Z0-9_]+)\s*}}/g, (_match, source, path) => {
        if (source === 'literal') return '';
        const text = resolveBinding({ source, path } as Binding, contexts);
        return text ?? '';
    });

    return resolved
        .replace(/[\t ]{2,}/g, ' ')
        .replace(/\s+,/g, ',')
        .replace(/\s+\//g, ' /')
        .replace(/([,:\/])\s*([,:\/])/g, '$1 $2')
        .trim();
}
