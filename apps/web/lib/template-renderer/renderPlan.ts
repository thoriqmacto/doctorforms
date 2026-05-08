import type { TemplateField, TemplateSection, TemplateViewModel } from '@/components/template-renderer/TemplateEngine';
import { formatFindingsGroupText } from '@/lib/template-renderer/sectionTransforms';
import {
    resolveBinding,
    resolveTemplateString,
    type AlignToken,
    type FontSizeToken,
    type FontWeightToken,
    type HeaderConfig,
    type HeaderLayout,
    type HospitalContext,
    type ImageSizeToken,
    type OperatorContext,
    type PatientContext,
    type RenderContexts,
    type ReportContext,
    type SignatoryContext,
    type SpacingToken,
    type TestContext,
} from '@/lib/template-renderer/schema';

/**
 * A `ReportRenderPlan` is an ordered list of display blocks. HtmlView and the
 * pdf-lib renderer both consume the exact same plan, so layout decisions
 * (ordering, column counts, field grouping) live in one place instead of
 * being reimplemented per view.
 *
 * Pipeline:
 *   TemplateController → grouped_sections (API)
 *     → createTemplateViewModel (TemplateEngine.ts)
 *     → buildReportRenderPlan (this file)
 *         ├─ if templates.header_config exists → structured header
 *         └─ else → legacy hardcoded header from hospital context
 *     → HtmlView.tsx / generateTemplatePdf()
 */

// ---------------------------------------------------------------------------
// Block types
// ---------------------------------------------------------------------------

export type StructuredHeaderLine = {
    text: string;
    font?: FontSizeToken;
    weight?: FontWeightToken;
    align?: AlignToken;
    uppercase?: boolean;
    marginTop?: SpacingToken;
};

export type StructuredHeader = {
    layout: HeaderLayout;
    leftLogo?: { url?: string; size: ImageSizeToken; visible: boolean };
    rightLogo?: { url?: string; size: ImageSizeToken; visible: boolean };
    lines: StructuredHeaderLine[];
    divider: boolean;
};

/**
 * Hospital header block.
 *
 * When `structured` is present (header_config path), renderers draw the
 * structured form. Otherwise they fall back to the legacy shape —
 * which is what existing templates without header_config still use.
 */
export type HospitalHeaderBlock = {
    kind: 'hospital_header';
    structured?: StructuredHeader;
    // Legacy
    leftLogoUrl?: string;
    rightLogoUrl?: string;
    topLine?: string;
    title?: string;
    contactLines?: string[];
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
    sipNumber?: string;
    signatureImageUrl?: string;
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

// Re-export context types so upstream callers have one import source.
export type {
    HospitalContext,
    PatientContext,
    ReportContext,
    OperatorContext,
    SignatoryContext,
    TestContext,
    RenderContexts,
};

export type BuildPlanInput = {
    viewModel: TemplateViewModel;
    sectionKinds?: Record<string, SectionKind>;
    hospital?: HospitalContext;
    patient?: PatientContext;
    report?: ReportContext;
    operator?: OperatorContext;
    signatory?: SignatoryContext;
    test?: TestContext;
    /** Structured header definition from templates.header_config. Takes precedence over legacy header rendering. */
    headerConfig?: HeaderConfig | null;
    testName?: string;
    /** right-side logo for the legacy hospital header, independent of hospital.logo_url */
    secondaryLogoUrl?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    // Backend returns the kind on grouped_sections[].kind (via TemplateResource::classifySectionKind).
    // We no longer duplicate that classifier on the frontend; missing kind = "general".
    return section.kind ?? 'general';
}

// ---------------------------------------------------------------------------
// Header composition — structured (header_config) then legacy fallback
// ---------------------------------------------------------------------------

function buildStructuredHeader(
    headerConfig: HeaderConfig,
    contexts: RenderContexts
): HospitalHeaderBlock {
    const leftLogoVisible = headerConfig.logo.left?.visible ?? false;
    const rightLogoVisible = headerConfig.logo.right?.visible ?? false;

    const leftLogoUrl = headerConfig.logo.left?.binding
        ? resolveBinding(headerConfig.logo.left.binding, contexts)
        : undefined;
    const rightLogoUrl = headerConfig.logo.right?.binding
        ? resolveBinding(headerConfig.logo.right.binding, contexts)
        : undefined;

    const lines: StructuredHeaderLine[] = headerConfig.lines
        .filter((line) => line.visible !== false)
        .map((line) => {
            let text = '';
            if (line.template !== undefined) {
                text = resolveTemplateString(line.template, contexts);
            } else if (line.binding) {
                text = resolveBinding(line.binding, contexts) ?? '';
            } else if (line.literal !== undefined) {
                text = line.literal;
            }
            if (line.uppercase && text) text = text.toUpperCase();
            return {
                text,
                font: line.font,
                weight: line.weight,
                align: line.align,
                uppercase: line.uppercase,
                marginTop: line.marginTop,
            };
        })
        .filter((line) => line.text.trim().length > 0);

    return {
        kind: 'hospital_header',
        structured: {
            layout: headerConfig.layout,
            leftLogo: leftLogoVisible
                ? { url: leftLogoUrl, size: headerConfig.logo.left?.size ?? 'lg', visible: true }
                : undefined,
            rightLogo: rightLogoVisible
                ? { url: rightLogoUrl, size: headerConfig.logo.right?.size ?? 'lg', visible: true }
                : undefined,
            lines,
            divider: headerConfig.divider?.visible ?? true,
        },
    };
}

function buildLegacyHospitalHeader(
    hospital: HospitalContext | undefined,
    secondaryLogoUrl: string | undefined
): HospitalHeaderBlock | null {
    if (!hospital) return null;

    const province = nonEmpty(hospital.province);
    const city = nonEmpty(hospital.city);
    // Prefer hospital.parent_org_line (real field); fall back to the old
    // hardcoded "PEMERINTAH PROVINSI {province}" convention.
    const topLine =
        nonEmpty(hospital.parent_org_line) ??
        (province ? `PEMERINTAH PROVINSI ${province.toUpperCase()}` : undefined);

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
        rightLogoUrl: nonEmpty(secondaryLogoUrl) ?? nonEmpty(hospital.secondary_logo_url),
        topLine,
        title: (nonEmpty(hospital.name) ?? '').toUpperCase(),
        contactLines: contactBits,
        city: city ? city.toUpperCase() : undefined,
    };
}

// ---------------------------------------------------------------------------
// Info grid / section builders
// ---------------------------------------------------------------------------

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
    report: ReportContext | undefined,
    signatory: SignatoryContext | undefined
): SignatureBlock {
    // Priority order for the signing person:
    //   1. report.signatory (hospital_signatories row, the source of truth)
    //   2. a textarea field inside the signature section (legacy free-text)
    //   3. a text field inside the signature section (legacy free-text)
    //   4. operator context / report.operator / report.supervisor
    const textareaField = section.fields.find((f) => f.type === 'textarea');
    const labelField = section.fields.find((f) => f.type === 'text');

    const name =
        nonEmpty(signatory?.name) ??
        nonEmpty(textareaField?.value) ??
        nonEmpty(labelField?.value) ??
        nonEmpty(operator?.name) ??
        nonEmpty(report?.supervisor) ??
        nonEmpty(report?.operator) ??
        '';

    const subtitle =
        nonEmpty(signatory?.position_title) ??
        nonEmpty(operator?.position_title) ??
        undefined;

    return {
        kind: 'signature',
        name,
        subtitle,
        sipNumber: nonEmpty(signatory?.sip_number),
        signatureImageUrl: nonEmpty(signatory?.signature_image_url),
    };
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

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Convert a template view model plus data context into an ordered list of
 * display blocks.
 *
 * Header source of truth, in order:
 *   1. templates.header_config (structured, from admin editor)
 *   2. legacy hardcoded header derived from hospital context
 *   3. fall back to the template's "Header" section (kept verbatim)
 */
export function buildReportRenderPlan(input: BuildPlanInput): ReportRenderPlan {
    const {
        viewModel,
        sectionKinds,
        hospital,
        patient,
        report,
        operator,
        signatory,
        test,
        headerConfig,
        secondaryLogoUrl,
    } = input;

    const contexts: RenderContexts = {
        hospital,
        patient,
        user: operator,
        report,
        signatory,
        test,
    };

    const sections: PlanSection[] = viewModel.sections.map((section) => ({
        ...section,
        kind: sectionKinds?.[section.section],
    }));

    const blocks: RenderBlock[] = [];

    // 1. Structured header (preferred)
    if (headerConfig) {
        blocks.push(buildStructuredHeader(headerConfig, contexts));
    } else {
        // 2. Legacy header derived from hospital context
        const legacy = buildLegacyHospitalHeader(hospital, secondaryLogoUrl);
        if (legacy) {
            blocks.push(legacy);
        } else {
            // 3. Template-declared Header section (last resort)
            const templateHeader = sections.find((s) => kindOf(s) === 'header');
            if (templateHeader && templateHeader.fields.length) {
                blocks.push(buildGeneric({ ...templateHeader, section: templateHeader.section || 'Header' }));
            }
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
            blocks.push(buildSignature(section, operator, report, signatory));
            continue;
        }

        blocks.push(buildGeneric(section));
    }

    // Ensure a signature block closes the report even when the template
    // didn't declare one. Uses signatory > operator > report.operator.
    const hasSignature = blocks.some((b) => b.kind === 'signature');
    if (!hasSignature && (signatory?.name || operator?.name || report?.operator)) {
        blocks.push({
            kind: 'signature',
            name:
                nonEmpty(signatory?.name) ??
                nonEmpty(operator?.name) ??
                nonEmpty(report?.operator) ??
                '',
            subtitle:
                nonEmpty(signatory?.position_title) ??
                nonEmpty(operator?.position_title) ??
                undefined,
            sipNumber: nonEmpty(signatory?.sip_number),
            signatureImageUrl: nonEmpty(signatory?.signature_image_url),
        });
    }

    return { title: viewModel.title, blocks };
}

export const __testing = { formatDob, formatStudyDate };
