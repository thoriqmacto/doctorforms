import type { TemplateField, TemplateSection, TemplateViewModel } from '@/components/template-renderer/TemplateEngine';
import { formatFindingsGroupText } from '@/lib/template-renderer/sectionTransforms';

/**
 * A `ReportRenderPlan` is an ordered list of display blocks. HtmlView and the
 * pdf-lib renderer both consume the exact same plan, so layout decisions
 * (ordering, column counts, field grouping) live in one place instead of
 * being reimplemented per view.
 */

export type HospitalHeaderBlock = {
    kind: 'hospital_header';
    leftLogoUrl?: string;
    rightLogoUrl?: string;
    /** provincial / government prefix line, e.g. "PEMERINTAH PROVINSI KALIMANTAN BARAT" */
    topLine?: string;
    /** main hospital name, rendered largest */
    title: string;
    /** contact/address lines, rendered small */
    contactLines: string[];
    /** city line, rendered slightly larger than contact lines */
    city?: string;
};

export type ReportTitleBlock = {
    kind: 'report_title';
    text: string;
};

export type InfoGridBlock = {
    kind: 'info_grid';
    columns: Array<Array<{ label: string; value: string }>>;
};

export type MeasurementCell = {
    label: string;
    value: string;
    unit: string;
};

export type MeasurementsBlock = {
    kind: 'measurements';
    title?: string;
    cols: number;
    cells: MeasurementCell[];
};

export type FindingsBlock = {
    kind: 'findings';
    title: string;
    rows: Array<{ label: string; text: string }>;
};

export type ConclusionBlock = {
    kind: 'conclusion';
    title: string;
    items: string[];
};

export type SignatureBlock = {
    kind: 'signature';
    name: string;
    subtitle?: string;
};

export type GenericSectionBlock = {
    kind: 'generic';
    title: string;
    rows: Array<{ label?: string; value: string; isStatic: boolean }>;
};

export type RenderBlock =
    | HospitalHeaderBlock
    | ReportTitleBlock
    | InfoGridBlock
    | MeasurementsBlock
    | FindingsBlock
    | ConclusionBlock
    | SignatureBlock
    | GenericSectionBlock;

export type ReportRenderPlan = {
    title: string;
    blocks: RenderBlock[];
};

export type SectionKind =
    | 'header'
    | 'measurements'
    | 'findings'
    | 'conclusion'
    | 'signature'
    | 'general';

export type PlanSection = TemplateSection & { kind?: SectionKind };

export type HospitalContext = {
    name?: string;
    address?: string;
    province?: string;
    city?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo_url?: string;
};

export type PatientContext = {
    name?: string;
    mrn?: string;
    dob?: string;
    age?: number | string;
    diagnosis_brief?: string;
    referring_physician?: string;
    dos?: string;
};

export type ReportContext = {
    title?: string;
    operator?: string;
    supervisor?: string;
    device?: string;
};

export type OperatorContext = {
    name?: string;
    position_title?: string;
};

export type BuildPlanInput = {
    viewModel: TemplateViewModel;
    sectionKinds?: Record<string, SectionKind>;
    hospital?: HospitalContext;
    patient?: PatientContext;
    report?: ReportContext;
    operator?: OperatorContext;
    testName?: string;
    /** right-side logo for the hospital header, independent of hospital.logo_url */
    secondaryLogoUrl?: string;
};

const EM_DASH = '—';

function nonEmpty(value: string | undefined | null): string | undefined {
    if (value === undefined || value === null) return undefined;
    const trimmed = String(value).trim();
    return trimmed ? trimmed : undefined;
}

function formatDob(dob?: string): string {
    if (!dob) return EM_DASH;
    const parsed = new Date(dob);
    if (Number.isNaN(parsed.getTime())) return dob;
    const day = String(parsed.getUTCDate()).padStart(2, '0');
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const year = parsed.getUTCFullYear();
    return `${day}/${month}/${year}`;
}

function formatStudyDate(dos?: string): string {
    if (!dos) return EM_DASH;
    const parsed = new Date(dos);
    if (Number.isNaN(parsed.getTime())) return dos;
    const day = parsed.getUTCDate();
    const month = parsed.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    const year = parsed.getUTCFullYear();
    return `${day} ${month} ${year}`;
}

function kindOf(section: PlanSection): SectionKind {
    if (section.kind) return section.kind;
    return 'general';
}

function buildHospitalHeader(
    hospital: HospitalContext | undefined,
    secondaryLogoUrl: string | undefined
): HospitalHeaderBlock | null {
    if (!hospital) return null;

    const province = nonEmpty(hospital.province);
    const city = nonEmpty(hospital.city);
    const topLine = province ? `PEMERINTAH PROVINSI ${province.toUpperCase()}` : undefined;

    const contactBits: string[] = [];
    const addressLine = nonEmpty(hospital.address);
    const phone = nonEmpty(hospital.phone);
    if (addressLine || phone) {
        contactBits.push([addressLine, phone ? `Telp: ${phone}` : undefined].filter(Boolean).join(', '));
    }
    const email = nonEmpty(hospital.email);
    const website = nonEmpty(hospital.website);
    if (email || website) {
        contactBits.push([email ? `Email: ${email}` : undefined, website ? `Website: ${website}` : undefined].filter(Boolean).join(', '));
    }

    return {
        kind: 'hospital_header',
        leftLogoUrl: nonEmpty(hospital.logo_url),
        rightLogoUrl: nonEmpty(secondaryLogoUrl),
        topLine,
        title: (nonEmpty(hospital.name) ?? '').toUpperCase(),
        contactLines: contactBits,
        city: city ? city.toUpperCase() : undefined,
    };
}

function buildInfoGrid(
    patient: PatientContext | undefined,
    report: ReportContext | undefined,
    operator: OperatorContext | undefined
): InfoGridBlock | null {
    if (!patient && !report && !operator) return null;

    const left: Array<{ label: string; value: string }> = [
        { label: 'Name', value: nonEmpty(patient?.name) ?? EM_DASH },
        { label: 'MR Number', value: nonEmpty(patient?.mrn) ?? EM_DASH },
        { label: 'Date of Birth', value: formatDob(patient?.dob) },
        {
            label: 'Age',
            value: patient?.age !== undefined && patient.age !== null && String(patient.age).trim() !== ''
                ? `${patient.age} y.o`
                : EM_DASH,
        },
    ];

    const right: Array<{ label: string; value: string }> = [
        { label: 'Operator', value: nonEmpty(report?.operator) ?? nonEmpty(operator?.name) ?? EM_DASH },
        { label: 'Study Date', value: formatStudyDate(patient?.dos) },
        { label: 'Diagnosis', value: nonEmpty(patient?.diagnosis_brief) ?? EM_DASH },
        { label: 'Referring Physician', value: nonEmpty(patient?.referring_physician) ?? EM_DASH },
        { label: 'Medical Device', value: nonEmpty(report?.device) ?? EM_DASH },
    ];

    return { kind: 'info_grid', columns: [left, right] };
}

function valueOf(field: TemplateField, isHeaderField = false): string {
    if (isHeaderField && field.isStatic && field.defaultValue) return field.defaultValue;
    return field.value || '';
}

function buildMeasurements(section: PlanSection): MeasurementsBlock {
    return {
        kind: 'measurements',
        title: section.fields.some((f) => f.showSectionName) ? section.section : undefined,
        cols: 3,
        cells: section.fields.map((field) => ({
            label: field.label || '',
            value: valueOf(field) || EM_DASH,
            unit: field.measurementUnit || '',
        })),
    };
}

function buildFindings(findingsSections: PlanSection[]): FindingsBlock | null {
    if (findingsSections.length === 0) return null;

    const rows = findingsSections.flatMap((section) => {
        const resultField =
            section.fields.find((f) => f.type === 'textarea' && f.textareaMode === 'result') ??
            section.fields.find((f) => f.type === 'textarea') ??
            section.fields[0];

        if (!resultField) return [];

        const suffix = section.section.replace(/^findings_/i, '').trim();
        const label = formatFindingsGroupText(suffix) || resultField.label || section.section;

        return [{ label, text: valueOf(resultField) || '' }];
    });

    return { kind: 'findings', title: 'Findings', rows };
}

function buildConclusion(section: PlanSection): ConclusionBlock {
    const items = section.fields.flatMap((field) => {
        const raw = valueOf(field);
        if (!raw) return [];
        return raw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
    });

    return {
        kind: 'conclusion',
        title: section.section.trim() || 'Conclusion',
        items,
    };
}

function buildSignature(
    section: PlanSection,
    operator: OperatorContext | undefined,
    report: ReportContext | undefined
): SignatureBlock {
    const textareaField = section.fields.find((f) => f.type === 'textarea');
    const labelField = section.fields.find((f) => f.type === 'text');

    const name =
        nonEmpty(textareaField?.value) ??
        nonEmpty(labelField?.value) ??
        nonEmpty(operator?.name) ??
        nonEmpty(report?.supervisor) ??
        nonEmpty(report?.operator) ??
        '';

    const subtitle = nonEmpty(operator?.position_title) ?? undefined;

    return { kind: 'signature', name, subtitle };
}

function buildGeneric(section: PlanSection): GenericSectionBlock {
    return {
        kind: 'generic',
        title: section.section,
        rows: section.fields.map((field) => ({
            label: field.isStatic ? undefined : field.label || undefined,
            value: valueOf(field) || EM_DASH,
            isStatic: field.isStatic,
        })),
    };
}

/**
 * Convert a template view model plus data context into an ordered list of
 * display blocks. Section `kind` comes from the API (TemplateResource) —
 * falls back to heuristic by name for backwards compatibility.
 */
export function buildReportRenderPlan(input: BuildPlanInput): ReportRenderPlan {
    const { viewModel, sectionKinds, hospital, patient, report, operator, secondaryLogoUrl } = input;

    const sections: PlanSection[] = viewModel.sections.map((section) => ({
        ...section,
        kind: sectionKinds?.[section.section] ?? classifyByName(section.section),
    }));

    const blocks: RenderBlock[] = [];

    const hospitalHeader = buildHospitalHeader(hospital, secondaryLogoUrl);
    if (hospitalHeader) {
        blocks.push(hospitalHeader);
    } else {
        // Fall back to the template's "header" section when hospital context is absent.
        const templateHeader = sections.find((s) => kindOf(s) === 'header');
        if (templateHeader && templateHeader.fields.length) {
            blocks.push(buildGeneric({ ...templateHeader, section: templateHeader.section || 'Header' }));
        }
    }

    blocks.push({ kind: 'report_title', text: viewModel.title });

    const infoGrid = buildInfoGrid(patient, report, operator);
    if (infoGrid) blocks.push(infoGrid);

    const findingsSections = sections.filter((s) => kindOf(s) === 'findings');
    let findingsEmitted = false;

    for (const section of sections) {
        const kind = kindOf(section);
        if (kind === 'header') continue;

        if (kind === 'findings') {
            if (!findingsEmitted) {
                const findings = buildFindings(findingsSections);
                if (findings) blocks.push(findings);
                findingsEmitted = true;
            }
            continue;
        }

        if (kind === 'measurements') {
            blocks.push(buildMeasurements(section));
            continue;
        }

        if (kind === 'conclusion') {
            blocks.push(buildConclusion(section));
            continue;
        }

        if (kind === 'signature') {
            blocks.push(buildSignature(section, operator, report));
            continue;
        }

        blocks.push(buildGeneric(section));
    }

    // Ensure a signature block closes the report if the template didn't emit one.
    const hasSignature = blocks.some((b) => b.kind === 'signature');
    if (!hasSignature && (operator?.name || report?.operator)) {
        blocks.push({
            kind: 'signature',
            name: nonEmpty(operator?.name) ?? nonEmpty(report?.operator) ?? '',
            subtitle: nonEmpty(operator?.position_title) ?? undefined,
        });
    }

    return { title: viewModel.title, blocks };
}

function classifyByName(name: string): SectionKind {
    const normalized = name.trim().toLowerCase();
    if (normalized === '' || normalized === 'header') return 'header';
    if (normalized.startsWith('findings_') || normalized === 'findings') return 'findings';
    if (normalized.includes('conclusion')) return 'conclusion';
    if (normalized.includes('signature')) return 'signature';
    if (/(measurement|calculation|2d|m-mode|doppler|hemodynamic|indices)/.test(normalized)) {
        return 'measurements';
    }
    return 'general';
}

export const __testing = { classifyByName, formatDob, formatStudyDate };
