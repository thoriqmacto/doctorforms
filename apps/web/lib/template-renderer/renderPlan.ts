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

export type MeasurementImagesBlock = {
    kind: 'measurement_images';
    title?: string;
    images: Array<{ id: number; url: string; caption?: string }>;
};

export type FindingsBlock = {
    kind: 'findings';
    title: string;
    rows: Array<{ label: string; text: string }>;
};

export type ConclusionItem =
    | { kind: 'text'; text: string }
    | { kind: 'extra'; label: string; text: string };

export type ConclusionBlock = {
    kind: 'conclusion';
    title: string;
    items: ConclusionItem[];
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
    rows: Array<{
        label?: string;
        value: string;
        isStatic: boolean;
        /** PR E (Issue 8) — optional secondary textarea content. */
        extra?: string;
        /**
         * Display label rendered in bold above `extra` (e.g. "Additional
         * note:"). Source: parsed FieldOptions.extraTextareaLabel.
         */
        extraLabel?: string;
        /**
         * Emphasis style for the secondary block. Kept on the block for
         * backward compatibility with the older renderer. The new default
         * rendering paints the label in bold and the content in regular
         * weight regardless of this value.
         */
        extraEmphasis?: 'italic' | 'bold' | 'muted' | 'normal';
    }>;
};

export type RenderBlock =
    | HospitalHeaderBlock
    | ReportTitleBlock
    | InfoGridBlock
    | MeasurementsBlock
    | MeasurementImagesBlock
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
    /**
     * Measurement screenshots (PR D). Already filtered to
     * include_in_report = true by the caller. Grouped by
     * template_section_key so the renderer can drop a
     * MeasurementImagesBlock next to the matching measurement section.
     */
    images?: Array<{
        id: number;
        url: string;
        template_section_key: string;
        original_filename?: string | null;
        sort_order?: number;
        include_in_report?: boolean;
    }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EM_DASH = '—';

// PR E (Issue 8) — textarea_free can encode an optional secondary
// textarea inside the same column with a magic prefix. Keep this
// constant in sync with TemplateFormRenderer.ts.
const EXTRA_TEXTAREA_PREFIX = '__df_extra_v1__::';

function decodeExtraTextarea(raw: string | null | undefined): { primary: string; extra: string } {
    const s = typeof raw === 'string' ? raw : '';
    if (!s.startsWith(EXTRA_TEXTAREA_PREFIX)) {
        return { primary: s, extra: '' };
    }
    try {
        const parsed = JSON.parse(s.slice(EXTRA_TEXTAREA_PREFIX.length)) as {
            p?: unknown;
            e?: unknown;
        };
        const primary = typeof parsed.p === 'string' ? parsed.p : '';
        const extra = typeof parsed.e === 'string' ? parsed.e : '';
        return { primary, extra };
    } catch {
        return { primary: s, extra: '' };
    }
}

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

/**
 * Re-arrange a flat list of measurement cells into rows of a column-major
 * layout that matches the RSUD Soedarso TTE reference PDF. The first
 * `cols - 1` columns each hold `rowsPerColumn` cells, top-to-bottom; any
 * overflow lands in the last column. Missing cells (when the input is
 * shorter than `cols * rowsPerColumn`) leave `undefined` placeholders so
 * the table grid stays aligned.
 *
 * Example with cells = [1..25], cols = 3, rowsPerColumn = 8:
 *   row 0: [1, 9, 17]
 *   row 1: [2, 10, 18]
 *   ...
 *   row 7: [8, 16, 24]
 *   row 8: [undefined, undefined, 25]
 */
export function arrangeMeasurementCellsColumnMajor<T>(
    cells: T[],
    cols = 3,
    rowsPerColumn = 8,
): Array<Array<T | undefined>> {
    if (cols <= 0 || cells.length === 0) return [];
    const columns: T[][] = [];
    let cursor = 0;
    for (let c = 0; c < cols; c++) {
        if (c === cols - 1) {
            // Last column absorbs any overflow so the first columns
            // stay at the requested rowsPerColumn target.
            columns.push(cells.slice(cursor));
        } else {
            columns.push(cells.slice(cursor, cursor + rowsPerColumn));
            cursor += rowsPerColumn;
        }
    }
    const totalRows = Math.max(rowsPerColumn, ...columns.map((col) => col.length));
    const rows: Array<Array<T | undefined>> = [];
    for (let r = 0; r < totalRows; r++) {
        const row: Array<T | undefined> = [];
        for (let c = 0; c < cols; c++) {
            row.push(columns[c][r]);
        }
        rows.push(row);
    }
    return rows;
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

        const raw = (valueOf(resultField) || '').trim();
        // PR E (Issue 9) — when the doctor leaves a finding's result
        // textarea blank, drop the row entirely from HTML/PDF. The
        // numbering downstream (HTML/PDF list rendering) follows the
        // surviving rows so there are no gaps.
        if (raw === '') return [];

        const suffix = section.section.replace(/^findings_/i, '').trim();
        const label = formatFindingsGroupText(suffix) || resultField.label || section.section;

        return [{ label, text: raw }];
    });

    if (rows.length === 0) return null;

    return { kind: 'findings', title: 'Findings', rows };
}

function buildConclusion(section: PlanSection): ConclusionBlock {
    const items: ConclusionItem[] = [];

    for (const field of section.fields) {
        const raw = valueOf(field);
        if (!raw) continue;
        // textarea_free values can encode an optional secondary
        // textarea inside the same column via the __df_extra_v1__
        // prefix. Decoding here mirrors buildGeneric() so the encoded
        // JSON never leaks into the final HTML/PDF rendering — the
        // previous behaviour split the encoded string straight onto
        // the conclusion bullet list.
        const decoded = decodeExtraTextarea(raw);

        for (const line of decoded.primary.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (trimmed.length === 0) continue;
            items.push({ kind: 'text', text: trimmed });
        }

        const extraText = decoded.extra.trim();
        if (extraText.length > 0) {
            items.push({
                kind: 'extra',
                label: field.extraTextareaLabel || 'Additional note',
                text: extraText,
            });
        }
    }

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
        rows: section.fields.map((field) => {
            const raw = valueOf(field) || '';
            const decoded = decodeExtraTextarea(raw);
            const hasExtra = decoded.extra.trim().length > 0;
            return {
                label: field.isStatic ? undefined : field.label || undefined,
                value: decoded.primary || EM_DASH,
                isStatic: field.isStatic,
                // PR E (Issue 8) — surface the optional secondary
                // textarea content together with its configured label.
                // Renderers paint the label in bold and the content in
                // regular weight; extraEmphasis stays on the block for
                // backward compatibility but is no longer used by the
                // default rendering path.
                extra: hasExtra ? decoded.extra : undefined,
                extraLabel: hasExtra
                    ? field.extraTextareaLabel || 'Additional note'
                    : undefined,
                extraEmphasis: field.extraTextareaEmphasis ?? 'italic',
            };
        }),
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
        const legacy = buildLegacyHospitalHeader(hospital, secondaryLogoUrl);
        if (legacy) blocks.push(legacy);
    }

    const reportTitleText = nonEmpty(input.testName) ?? nonEmpty(test?.name) ?? viewModel.title;
    blocks.push({ kind: 'report_title', text: reportTitleText });

    // TODO: report_title and info_grid are still synthetic blocks built here.
    // Move them into editor-controlled layout/system blocks so every rendered block is template-configurable.
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
            // PR (image reposition) — image emission deferred to the
            // very end of the plan, after the signature block, to match
            // the RSUD reference layout where echocardiography images
            // close the report rather than interrupting the body.
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
    if (
        !hasSignature &&
        (signatory?.name ||
            signatory?.signature_image_url ||
            operator?.name ||
            report?.operator)
    ) {
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

    // Echocardiography images — collected from every measurement section
    // and rendered as a single trailing block after the signatory so the
    // body of the report stays uninterrupted. Sorted by (sort_order, id)
    // and pre-filtered for include_in_report.
    const allImages = (input.images ?? [])
        .filter((img) => img.include_in_report !== false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);
    if (allImages.length > 0) {
        blocks.push({
            kind: 'measurement_images',
            title: 'Echocardiography Images',
            images: allImages.map((img) => ({
                id: img.id,
                url: img.url,
                caption: img.original_filename ?? undefined,
            })),
        });
    }

    return { title: viewModel.title, blocks };
}

export const __testing = { formatDob, formatStudyDate };
