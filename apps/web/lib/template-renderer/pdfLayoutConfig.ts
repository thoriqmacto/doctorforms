/**
 * PDF layout configuration — the structured shape of `templates.layout_config.pdf`.
 *
 * The same normalized object drives:
 *  - the HTML view (via CSS variables on the article wrapper)
 *  - the pdf-lib renderer (via {@link PdfLayoutOverrides})
 *  - the "PDF Layout Settings" panel on the View PDF screen
 *
 * Only numeric / safe-enum values are stored. No arbitrary CSS strings —
 * the renderers convert numbers into px/pt themselves.
 */

export type PdfDensity = 'compact' | 'normal' | 'spacious';

export type PdfPageSize = 'A4'; // only A4 is supported today; matches reportLayout.

export type PdfLayoutPage = {
    size: PdfPageSize;
    marginTopMm: number;
    marginRightMm: number;
    marginBottomMm: number;
    marginLeftMm: number;
};

export type PdfLayoutTypography = {
    baseFontSizePx: number;
    smallFontSizePx: number;
    lineHeight: number;
    paragraphSpacingPx: number;
};

export type PdfLayoutSpacing = {
    sectionGapPx: number;
    fieldGapPx: number;
    headerGapPx: number;
    tableCellPaddingPx: number;
};

export type PdfLayoutConfig = {
    pdf: {
        page: PdfLayoutPage;
        typography: PdfLayoutTypography;
        spacing: PdfLayoutSpacing;
        density: PdfDensity;
    };
};

/**
 * Default layout — matches the visual baseline shipped before PR #204
 * so reports without a saved config render exactly as before.
 *
 * Margins are in millimetres because authoring tools (Word, Pages, etc.)
 * present margins that way and clinicians think in mm. Spacing and
 * typography are in pixels because they map 1:1 to the CSS used by the
 * HTML view (and 1 px ≈ 0.75 pt for the PDF generator).
 */
export const DEFAULT_PDF_LAYOUT_CONFIG: PdfLayoutConfig = {
    pdf: {
        page: {
            size: 'A4',
            marginTopMm: 8,
            marginRightMm: 8,
            marginBottomMm: 8,
            marginLeftMm: 8,
        },
        typography: {
            baseFontSizePx: 11,
            smallFontSizePx: 9,
            lineHeight: 1.25,
            paragraphSpacingPx: 4,
        },
        spacing: {
            sectionGapPx: 8,
            fieldGapPx: 4,
            headerGapPx: 6,
            tableCellPaddingPx: 4,
        },
        density: 'normal',
    },
};

/** Numeric clamp bounds — also enforced server-side. Keep both in sync. */
export const PDF_LAYOUT_BOUNDS = {
    marginMm: { min: 0, max: 40 },
    baseFontSizePx: { min: 8, max: 18 },
    smallFontSizePx: { min: 6, max: 16 },
    lineHeight: { min: 1, max: 2 },
    paragraphSpacingPx: { min: 0, max: 24 },
    sectionGapPx: { min: 0, max: 48 },
    fieldGapPx: { min: 0, max: 24 },
    headerGapPx: { min: 0, max: 32 },
    tableCellPaddingPx: { min: 0, max: 16 },
} as const;

/** Presets exposed in the panel as quick-start buttons. */
export const PDF_LAYOUT_PRESETS: Record<PdfDensity, PdfLayoutConfig> = {
    compact: {
        pdf: {
            page: { size: 'A4', marginTopMm: 6, marginRightMm: 6, marginBottomMm: 6, marginLeftMm: 6 },
            typography: { baseFontSizePx: 10, smallFontSizePx: 8, lineHeight: 1.15, paragraphSpacingPx: 2 },
            spacing: { sectionGapPx: 4, fieldGapPx: 2, headerGapPx: 3, tableCellPaddingPx: 2 },
            density: 'compact',
        },
    },
    normal: DEFAULT_PDF_LAYOUT_CONFIG,
    spacious: {
        pdf: {
            page: { size: 'A4', marginTopMm: 14, marginRightMm: 14, marginBottomMm: 14, marginLeftMm: 14 },
            typography: { baseFontSizePx: 12, smallFontSizePx: 10, lineHeight: 1.5, paragraphSpacingPx: 8 },
            spacing: { sectionGapPx: 14, fieldGapPx: 8, headerGapPx: 10, tableCellPaddingPx: 6 },
            density: 'spacious',
        },
    },
};

function clamp(n: unknown, min: number, max: number, fallback: number): number {
    const num = typeof n === 'number' ? n : typeof n === 'string' ? Number(n) : NaN;
    if (!Number.isFinite(num)) return fallback;
    return Math.min(max, Math.max(min, num));
}

/**
 * Normalize an arbitrary layout_config payload into a guaranteed-valid
 * {@link PdfLayoutConfig}. Missing keys fall back to the default; numeric
 * values are clamped into safe ranges; unknown densities collapse to
 * 'normal'. The result is safe to feed straight into the CSS / PDF
 * rendering pipeline without further checks.
 */
export function normalizePdfLayoutConfig(raw: unknown): PdfLayoutConfig {
    const defaults = DEFAULT_PDF_LAYOUT_CONFIG.pdf;
    const obj = (raw && typeof raw === 'object' ? (raw as Record<string, any>) : {}) as Record<string, any>;
    const pdf = (obj.pdf && typeof obj.pdf === 'object' ? obj.pdf : {}) as Record<string, any>;

    const page = (pdf.page && typeof pdf.page === 'object' ? pdf.page : {}) as Record<string, any>;
    const typography = (pdf.typography && typeof pdf.typography === 'object' ? pdf.typography : {}) as Record<string, any>;
    const spacing = (pdf.spacing && typeof pdf.spacing === 'object' ? pdf.spacing : {}) as Record<string, any>;

    const densityRaw = typeof pdf.density === 'string' ? pdf.density.toLowerCase() : '';
    const density: PdfDensity =
        densityRaw === 'compact' || densityRaw === 'spacious' || densityRaw === 'normal'
            ? (densityRaw as PdfDensity)
            : defaults.density;

    const b = PDF_LAYOUT_BOUNDS;

    return {
        pdf: {
            page: {
                size: 'A4',
                marginTopMm: clamp(page.marginTopMm, b.marginMm.min, b.marginMm.max, defaults.page.marginTopMm),
                marginRightMm: clamp(page.marginRightMm, b.marginMm.min, b.marginMm.max, defaults.page.marginRightMm),
                marginBottomMm: clamp(page.marginBottomMm, b.marginMm.min, b.marginMm.max, defaults.page.marginBottomMm),
                marginLeftMm: clamp(page.marginLeftMm, b.marginMm.min, b.marginMm.max, defaults.page.marginLeftMm),
            },
            typography: {
                baseFontSizePx: clamp(
                    typography.baseFontSizePx,
                    b.baseFontSizePx.min,
                    b.baseFontSizePx.max,
                    defaults.typography.baseFontSizePx,
                ),
                smallFontSizePx: clamp(
                    typography.smallFontSizePx,
                    b.smallFontSizePx.min,
                    b.smallFontSizePx.max,
                    defaults.typography.smallFontSizePx,
                ),
                lineHeight: clamp(typography.lineHeight, b.lineHeight.min, b.lineHeight.max, defaults.typography.lineHeight),
                paragraphSpacingPx: clamp(
                    typography.paragraphSpacingPx,
                    b.paragraphSpacingPx.min,
                    b.paragraphSpacingPx.max,
                    defaults.typography.paragraphSpacingPx,
                ),
            },
            spacing: {
                sectionGapPx: clamp(spacing.sectionGapPx, b.sectionGapPx.min, b.sectionGapPx.max, defaults.spacing.sectionGapPx),
                fieldGapPx: clamp(spacing.fieldGapPx, b.fieldGapPx.min, b.fieldGapPx.max, defaults.spacing.fieldGapPx),
                headerGapPx: clamp(spacing.headerGapPx, b.headerGapPx.min, b.headerGapPx.max, defaults.spacing.headerGapPx),
                tableCellPaddingPx: clamp(
                    spacing.tableCellPaddingPx,
                    b.tableCellPaddingPx.min,
                    b.tableCellPaddingPx.max,
                    defaults.spacing.tableCellPaddingPx,
                ),
            },
            density,
        },
    };
}

/**
 * Project a normalized config to the CSS custom properties consumed by
 * the HTML report wrapper. Renderers should spread the returned object
 * into `style={{ ... }}` on the report root.
 */
export function pdfLayoutConfigToCssVars(config: PdfLayoutConfig): Record<string, string> {
    const p = config.pdf;
    return {
        '--report-page-margin-top': `${p.page.marginTopMm}mm`,
        '--report-page-margin-right': `${p.page.marginRightMm}mm`,
        '--report-page-margin-bottom': `${p.page.marginBottomMm}mm`,
        '--report-page-margin-left': `${p.page.marginLeftMm}mm`,
        '--report-base-font-size': `${p.typography.baseFontSizePx}px`,
        '--report-small-font-size': `${p.typography.smallFontSizePx}px`,
        '--report-line-height': String(p.typography.lineHeight),
        '--report-paragraph-spacing': `${p.typography.paragraphSpacingPx}px`,
        '--report-section-gap': `${p.spacing.sectionGapPx}px`,
        '--report-field-gap': `${p.spacing.fieldGapPx}px`,
        '--report-header-gap': `${p.spacing.headerGapPx}px`,
        '--report-table-cell-padding': `${p.spacing.tableCellPaddingPx}px`,
    } as Record<string, string>;
}

/**
 * Numeric overrides for the pdf-lib renderer. Margins are converted from
 * mm to PostScript points (1 mm ≈ 2.83465 pt); font sizes from px to pt
 * (1 px ≈ 0.75 pt). The renderer treats every field as optional so a
 * caller can pass an empty object to keep the historical defaults.
 */
export type PdfLayoutOverrides = {
    pageMarginPt?: number; // shared by all four sides if no per-side margin is set on the page.
    pageMarginTopPt?: number;
    pageMarginRightPt?: number;
    pageMarginBottomPt?: number;
    pageMarginLeftPt?: number;
    baseFontPt?: number;
    smallFontPt?: number;
    lineGapPt?: number;
    paragraphSpacingPt?: number;
    sectionGapPt?: number;
    fieldGapPt?: number;
    headerGapPt?: number;
    tableCellPaddingPt?: number;
};

const MM_TO_PT = 2.83465;
const PX_TO_PT = 0.75;

export function pdfLayoutConfigToPdfOverrides(config: PdfLayoutConfig): PdfLayoutOverrides {
    const p = config.pdf;
    const margins = [p.page.marginTopMm, p.page.marginRightMm, p.page.marginBottomMm, p.page.marginLeftMm];
    const uniformMargin = margins.every((m) => m === margins[0]) ? margins[0] * MM_TO_PT : undefined;
    return {
        pageMarginPt: uniformMargin,
        pageMarginTopPt: p.page.marginTopMm * MM_TO_PT,
        pageMarginRightPt: p.page.marginRightMm * MM_TO_PT,
        pageMarginBottomPt: p.page.marginBottomMm * MM_TO_PT,
        pageMarginLeftPt: p.page.marginLeftMm * MM_TO_PT,
        baseFontPt: p.typography.baseFontSizePx * PX_TO_PT,
        smallFontPt: p.typography.smallFontSizePx * PX_TO_PT,
        lineGapPt: Math.max(0, (p.typography.lineHeight - 1) * p.typography.baseFontSizePx * PX_TO_PT),
        paragraphSpacingPt: p.typography.paragraphSpacingPx * PX_TO_PT,
        sectionGapPt: p.spacing.sectionGapPx * PX_TO_PT,
        fieldGapPt: p.spacing.fieldGapPx * PX_TO_PT,
        headerGapPt: p.spacing.headerGapPx * PX_TO_PT,
        tableCellPaddingPt: p.spacing.tableCellPaddingPx * PX_TO_PT,
    };
}

/**
 * True when two configs are bytewise identical at every leaf — used by the
 * settings panel to decide whether the "Save" button is enabled and to
 * detect "back to default" state.
 */
export function layoutConfigsEqual(a: PdfLayoutConfig, b: PdfLayoutConfig): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}
