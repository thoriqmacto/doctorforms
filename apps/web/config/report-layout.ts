/**
 * Single source of truth for report layout geometry and typography.
 * Used by the HTML renderer (via Tailwind classes + these constants) and
 * the pdf-lib renderer so the two views stay visually consistent.
 *
 * PDF units are PostScript points (1pt = 1/72in). A4 = 595.28 x 841.89 pt.
 */

export const reportLayout = {
    page: {
        // A4 portrait
        widthPt: 595.28,
        heightPt: 841.89,
        // Trimmed from 34pt (~12mm) → 22pt (~7.8mm) to fit more content
        // on one page. Logos still anchor near the top; only the
        // surrounding whitespace shrinks.
        marginPt: 22,
        // mirror for HTML (A4 width in mm used by `.page-a4`)
        widthMm: 210,
        heightMm: 297,
        marginMm: 8,
    },
    hospitalHeader: {
        logoSizePt: 56,
        logoSizeClass: 'h-14 w-14',
        titleFontPt: 12,
        lineFontPt: 8,
        cityFontPt: 10,
        gapPt: 4,
    },
    reportTitle: {
        fontPt: 14,
        marginTopPt: 4,
        marginBottomPt: 2,
    },
    infoGrid: {
        labelFontPt: 9,
        valueFontPt: 9,
        paddingPt: 6,
        labelWidthRatio: 0.35, // label column as fraction of half-page
        rowGapPt: 3,
    },
    sectionHeader: {
        fontPt: 10,
        paddingYPt: 3,
        backgroundHex: 0xf1f5f9, // slate-100
        borderHex: 0x64748b, // slate-500
    },
    measurementsGrid: {
        cols: 3,
        labelFontPt: 8,
        valueFontPt: 9,
        unitFontPt: 8,
        cellPaddingPt: 3,
        rowHeightPt: 12,
    },
    findings: {
        labelFontPt: 9,
        textFontPt: 9,
        labelWidthRatio: 0.22,
        rowGapPt: 2,
        rowPaddingPt: 3,
    },
    conclusion: {
        fontPt: 10,
        bulletGapPt: 4,
        lineHeightPt: 10,
    },
    signature: {
        nameFontPt: 10,
        subtitleFontPt: 9,
        marginTopPt: 2,
    },
    colors: {
        // 0-1 rgb tuples for pdf-lib
        text: [0.1, 0.1, 0.1] as const,
        muted: [0.42, 0.42, 0.42] as const,
        border: [0.4, 0.45, 0.5] as const,
        sectionHeaderBg: [0.945, 0.961, 0.98] as const, // slate-100
    },
} as const;

export type ReportLayout = typeof reportLayout;
