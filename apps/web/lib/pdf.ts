import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { reportLayout } from '@/config/report-layout';
import type {
    ConclusionBlock,
    FindingsBlock,
    GenericSectionBlock,
    HospitalHeaderBlock,
    InfoGridBlock,
    MeasurementsBlock,
    RenderBlock,
    ReportRenderPlan,
    ReportTitleBlock,
    SignatureBlock,
    StructuredHeader,
} from '@/lib/template-renderer/renderPlan';
import {
    FONT_SIZE_PT,
    IMAGE_SIZE_PT,
    SPACING_PT,
} from '@/lib/template-renderer/schema';

const { colors } = reportLayout;
const TEXT = rgb(...colors.text);
const MUTED = rgb(...colors.muted);
const BORDER = rgb(...colors.border);
const SECTION_BG = rgb(...colors.sectionHeaderBg);
const WHITE = rgb(1, 1, 1);

type Fonts = {
    regular: PDFFont;
    bold: PDFFont;
    italic: PDFFont;
};

type Ctx = {
    doc: PDFDocument;
    page: PDFPage;
    fonts: Fonts;
    cursorY: number;
    contentWidth: number;
    pageWidth: number;
    pageHeight: number;
    margin: number;
};

function createPage(doc: PDFDocument): PDFPage {
    return doc.addPage([reportLayout.page.widthPt, reportLayout.page.heightPt]);
}

function ensureSpace(ctx: Ctx, required: number): void {
    if (ctx.cursorY - required < ctx.margin) {
        ctx.page = createPage(ctx.doc);
        ctx.cursorY = ctx.pageHeight - ctx.margin;
    }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const paragraphs = text.split(/\r?\n/);
    const lines: string[] = [];
    for (const paragraph of paragraphs) {
        if (paragraph.trim() === '') {
            lines.push('');
            continue;
        }
        const words = paragraph.split(/\s+/);
        let current = '';
        for (const word of words) {
            const candidate = current ? `${current} ${word}` : word;
            if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
                current = candidate;
                continue;
            }
            if (current) lines.push(current);
            // Handle words longer than maxWidth by splitting on characters.
            if (font.widthOfTextAtSize(word, size) > maxWidth) {
                let buffer = '';
                for (const char of word) {
                    if (font.widthOfTextAtSize(buffer + char, size) > maxWidth) {
                        if (buffer) lines.push(buffer);
                        buffer = char;
                    } else {
                        buffer += char;
                    }
                }
                current = buffer;
            } else {
                current = word;
            }
        }
        if (current) lines.push(current);
    }
    return lines.length === 0 ? [''] : lines;
}

async function embedLogo(doc: PDFDocument, url?: string): Promise<PDFImage | null> {
    if (!url) return null;

    const proxiedUrl = `/api/pdf-image-proxy?url=${encodeURIComponent(url)}`;

    try {
        const response = await fetch(proxiedUrl);
        if (!response.ok) {
            console.error('PDF logo proxy request failed', {
                status: response.status,
                logoUrl: url,
                proxyUrl: proxiedUrl,
            });
            return null;
        }

        const buffer = await response.arrayBuffer();
        const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
        const bytes = new Uint8Array(buffer);

        try {
            if (contentType.includes('png')) {
                return await doc.embedPng(bytes);
            }
            if (contentType.includes('jpeg') || contentType.includes('jpg')) {
                return await doc.embedJpg(bytes);
            }
        } catch (error) {
            console.error('PDF logo embedding failed', { error, logoUrl: url, contentType });
            return null;
        }

        console.error('PDF logo content type is unsupported', {
            logoUrl: url,
            contentType,
        });
        return null;
    } catch (error) {
        console.error('PDF logo proxy fetch crashed', {
            error,
            logoUrl: url,
            proxyUrl: proxiedUrl,
        });
        return null;
    }
}

function drawCenteredText(
    ctx: Ctx,
    text: string,
    font: PDFFont,
    size: number,
    y: number,
    color = TEXT,
    leftBound?: number,
    rightBound?: number
): void {
    const left = leftBound ?? ctx.margin;
    const right = rightBound ?? ctx.margin + ctx.contentWidth;
    const usable = right - left;
    const width = font.widthOfTextAtSize(text, size);
    const x = left + (usable - width) / 2;
    ctx.page.drawText(text, { x, y, size, font, color });
}

function fitImageInsideBox(
    image: PDFImage,
    maxWidth: number,
    maxHeight: number
): { width: number; height: number } {
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    return {
        width: image.width * scale,
        height: image.height * scale,
    };
}

function drawContainedImage(
    page: PDFPage,
    image: PDFImage,
    boxX: number,
    boxY: number,
    boxWidth: number,
    boxHeight: number
): void {
    const { width, height } = fitImageInsideBox(image, boxWidth, boxHeight);
    page.drawImage(image, {
        x: boxX + (boxWidth - width) / 2,
        y: boxY + (boxHeight - height) / 2,
        width,
        height,
    });
}

async function drawHospitalHeader(ctx: Ctx, block: HospitalHeaderBlock): Promise<void> {
    // Structured path — driven by templates.header_config.
    if (block.structured) {
        await drawStructuredHospitalHeader(ctx, block.structured);
        return;
    }

    // Legacy path — driven by the hospital context only.
    const { logoSizePt, titleFontPt, lineFontPt, cityFontPt } = reportLayout.hospitalHeader;
    const startY = ctx.cursorY;
    const contentLeft = ctx.margin + logoSizePt + 8;
    const contentRight = ctx.margin + ctx.contentWidth - logoSizePt - 8;

    const leftImg = await embedLogo(ctx.doc, block.leftLogoUrl);
    const rightImg = await embedLogo(ctx.doc, block.rightLogoUrl);

    // Text column — compute height to center logos against it.
    const textLines: Array<{ text: string; size: number; font: PDFFont }> = [];
    if (block.topLine) textLines.push({ text: block.topLine, size: lineFontPt + 2, font: ctx.fonts.bold });
    if (block.title) textLines.push({ text: block.title, size: titleFontPt, font: ctx.fonts.bold });
    for (const line of block.contactLines ?? []) {
        textLines.push({ text: line, size: lineFontPt, font: ctx.fonts.regular });
    }
    if (block.city) textLines.push({ text: block.city, size: cityFontPt, font: ctx.fonts.bold });

    const lineGap = 2;
    const usable = contentRight - contentLeft;
    const wrappedLines: Array<{ text: string; size: number; font: PDFFont }> = [];
    for (const line of textLines) {
        const wrapped = wrapText(line.text, line.font, line.size, usable);
        for (const w of wrapped) wrappedLines.push({ text: w, size: line.size, font: line.font });
    }
    const totalTextHeight = wrappedLines.reduce((sum, l) => sum + l.size + lineGap, 0);

    const blockHeight = Math.max(totalTextHeight, logoSizePt) + 8;
    ensureSpace(ctx, blockHeight);

    const firstLineHeight = wrappedLines[0]?.size ?? 0;
    let textY = startY - firstLineHeight;
    for (const line of wrappedLines) {
        drawCenteredText(ctx, line.text, line.font, line.size, textY, TEXT, contentLeft, contentRight);
        textY -= line.size + lineGap;
    }

    const logoY = startY - (blockHeight + logoSizePt) / 2;
    if (leftImg) {
        drawContainedImage(ctx.page, leftImg, ctx.margin, logoY, logoSizePt, logoSizePt);
    }
    if (rightImg) {
        drawContainedImage(
            ctx.page,
            rightImg,
            ctx.margin + ctx.contentWidth - logoSizePt,
            logoY,
            logoSizePt,
            logoSizePt
        );
    }

    ctx.cursorY = startY - blockHeight;
    // Draw separator line under header
    ctx.page.drawLine({
        start: { x: ctx.margin, y: ctx.cursorY + 2 },
        end: { x: ctx.margin + ctx.contentWidth, y: ctx.cursorY + 2 },
        thickness: 0.75,
        color: BORDER,
    });
    ctx.cursorY -= 6;
}

/**
 * Structured header renderer — consumes StructuredHeader produced by
 * buildReportRenderPlan from templates.header_config. Uses shared style
 * tokens (FONT_SIZE_PT / IMAGE_SIZE_PT / SPACING_PT) so HTML and PDF stay
 * visually in sync.
 */
async function drawStructuredHospitalHeader(ctx: Ctx, header: StructuredHeader): Promise<void> {
    const leftSize = header.leftLogo ? IMAGE_SIZE_PT[header.leftLogo.size] : 0;
    const rightSize = header.rightLogo ? IMAGE_SIZE_PT[header.rightLogo.size] : 0;
    const maxLogoSize = Math.max(leftSize, rightSize);
    const startY = ctx.cursorY;
    const contentLeft = ctx.margin + leftSize + (leftSize > 0 ? 8 : 0);
    const contentRight = ctx.margin + ctx.contentWidth - rightSize - (rightSize > 0 ? 8 : 0);
    const usable = contentRight - contentLeft;

    const leftImg = header.leftLogo?.visible ? await embedLogo(ctx.doc, header.leftLogo.url) : null;
    const rightImg = header.rightLogo?.visible ? await embedLogo(ctx.doc, header.rightLogo.url) : null;

    // Pre-wrap lines.
    type Wrapped = { text: string; size: number; font: PDFFont; align: 'left' | 'center' | 'right'; marginTop: number };
    const wrappedLines: Wrapped[] = [];
    for (const line of header.lines) {
        if (!line.text) continue;
        const size = FONT_SIZE_PT[line.font ?? 'sm'];
        const font = (line.weight ?? 'normal') === 'bold' ? ctx.fonts.bold : ctx.fonts.regular;
        const align = (line.align ?? 'center') as 'left' | 'center' | 'right';
        const marginTop = SPACING_PT[line.marginTop ?? 'none'];
        const segments = wrapText(line.text, font, size, usable);
        segments.forEach((seg, idx) => {
            wrappedLines.push({
                text: seg,
                size,
                font,
                align,
                marginTop: idx === 0 ? marginTop : 0,
            });
        });
    }

    const lineGap = 2;
    const totalTextHeight = wrappedLines.reduce((sum, l) => sum + l.size + lineGap + l.marginTop, 0);
    const blockHeight = Math.max(totalTextHeight, maxLogoSize) + 8;
    ensureSpace(ctx, blockHeight);

    let textY = startY - (wrappedLines[0]?.size ?? 0);
    for (const line of wrappedLines) {
        textY -= line.marginTop;
        if (line.align === 'left') {
            ctx.page.drawText(line.text, {
                x: contentLeft,
                y: textY,
                size: line.size,
                font: line.font,
                color: TEXT,
            });
        } else if (line.align === 'right') {
            const width = line.font.widthOfTextAtSize(line.text, line.size);
            ctx.page.drawText(line.text, {
                x: contentRight - width,
                y: textY,
                size: line.size,
                font: line.font,
                color: TEXT,
            });
        } else {
            drawCenteredText(ctx, line.text, line.font, line.size, textY, TEXT, contentLeft, contentRight);
        }
        textY -= line.size + lineGap;
    }

    const logoBoxY = startY - (blockHeight + maxLogoSize) / 2;
    if (leftImg && leftSize > 0) {
        const leftLogoY = logoBoxY + (maxLogoSize - leftSize) / 2;
        drawContainedImage(ctx.page, leftImg, ctx.margin, leftLogoY, leftSize, leftSize);
    }
    if (rightImg && rightSize > 0) {
        const rightLogoY = logoBoxY + (maxLogoSize - rightSize) / 2;
        drawContainedImage(
            ctx.page,
            rightImg,
            ctx.margin + ctx.contentWidth - rightSize,
            rightLogoY,
            rightSize,
            rightSize
        );
    }

    ctx.cursorY = startY - blockHeight;
    if (header.divider) {
        ctx.page.drawLine({
            start: { x: ctx.margin, y: ctx.cursorY + 2 },
            end: { x: ctx.margin + ctx.contentWidth, y: ctx.cursorY + 2 },
            thickness: 0.75,
            color: BORDER,
        });
    }
    ctx.cursorY -= 6;
}

function drawReportTitle(ctx: Ctx, block: ReportTitleBlock): void {
    const { fontPt, marginTopPt, marginBottomPt } = reportLayout.reportTitle;
    ensureSpace(ctx, fontPt + marginTopPt + marginBottomPt);
    ctx.cursorY -= marginTopPt;
    drawCenteredText(ctx, block.text, ctx.fonts.bold, fontPt, ctx.cursorY);
    ctx.cursorY -= fontPt + marginBottomPt;
}

function drawInfoGrid(ctx: Ctx, block: InfoGridBlock): void {
    const { labelFontPt, valueFontPt, paddingPt, rowGapPt } = reportLayout.infoGrid;
    const cols = block.columns.length;
    const colWidth = ctx.contentWidth / cols;
    const maxRows = Math.max(...block.columns.map((c) => c.length));
    const rowHeight = Math.max(labelFontPt, valueFontPt) + rowGapPt;
    const tableHeight = paddingPt * 2 + maxRows * rowHeight;

    ensureSpace(ctx, tableHeight + 4);
    const tableTop = ctx.cursorY;
    const tableBottom = tableTop - tableHeight;

    // Outer border
    ctx.page.drawRectangle({
        x: ctx.margin,
        y: tableBottom,
        width: ctx.contentWidth,
        height: tableHeight,
        borderColor: BORDER,
        borderWidth: 0.75,
    });

    // Column separators
    for (let c = 1; c < cols; c++) {
        const x = ctx.margin + c * colWidth;
        ctx.page.drawLine({
            start: { x, y: tableTop },
            end: { x, y: tableBottom },
            thickness: 0.5,
            color: BORDER,
        });
    }

    block.columns.forEach((rows, colIdx) => {
        const colX = ctx.margin + colIdx * colWidth + paddingPt;
        const labelWidth = (colWidth - paddingPt * 2) * 0.4;
        rows.forEach((row, rowIdx) => {
            const y = tableTop - paddingPt - labelFontPt - rowIdx * rowHeight;
            ctx.page.drawText(row.label, {
                x: colX,
                y,
                size: labelFontPt,
                font: ctx.fonts.bold,
                color: TEXT,
            });
            ctx.page.drawText(`: ${row.value}`, {
                x: colX + labelWidth,
                y,
                size: valueFontPt,
                font: ctx.fonts.regular,
                color: TEXT,
            });
        });
    });

    ctx.cursorY = tableBottom - 6;
}

function drawSectionBanner(ctx: Ctx, title: string): void {
    const { fontPt, paddingYPt } = reportLayout.sectionHeader;
    const bannerHeight = fontPt + paddingYPt * 2;
    ensureSpace(ctx, bannerHeight + 2);
    const top = ctx.cursorY;
    ctx.page.drawRectangle({
        x: ctx.margin,
        y: top - bannerHeight,
        width: ctx.contentWidth,
        height: bannerHeight,
        color: SECTION_BG,
        borderColor: BORDER,
        borderWidth: 0.5,
    });
    drawCenteredText(ctx, title.toUpperCase(), ctx.fonts.bold, fontPt, top - bannerHeight + paddingYPt);
    ctx.cursorY = top - bannerHeight;
}

function drawMeasurements(ctx: Ctx, block: MeasurementsBlock): void {
    drawSectionBanner(ctx, block.title ?? 'Measurements & Calculations');

    const { cols } = block;
    const { labelFontPt, valueFontPt, unitFontPt, cellPaddingPt, rowHeightPt } = reportLayout.measurementsGrid;

    // Each logical "column" holds label|value|unit sub-cells with widths 14/12/7 of 33.
    const colWidth = ctx.contentWidth / cols;
    const labelW = colWidth * (14 / 33);
    const valueW = colWidth * (12 / 33);
    const unitW = colWidth - labelW - valueW;

    const rows = Math.ceil(block.cells.length / cols);
    const tableHeight = rows * rowHeightPt;

    ensureSpace(ctx, tableHeight + 4);
    const top = ctx.cursorY;
    const bottom = top - tableHeight;

    ctx.page.drawRectangle({
        x: ctx.margin,
        y: bottom,
        width: ctx.contentWidth,
        height: tableHeight,
        color: WHITE,
        borderColor: BORDER,
        borderWidth: 0.5,
    });

    // Horizontal lines between rows
    for (let r = 1; r < rows; r++) {
        const y = top - r * rowHeightPt;
        ctx.page.drawLine({
            start: { x: ctx.margin, y },
            end: { x: ctx.margin + ctx.contentWidth, y },
            thickness: 0.3,
            color: BORDER,
        });
    }

    // Vertical sub-column lines
    for (let c = 0; c < cols; c++) {
        const colX = ctx.margin + c * colWidth;
        const x1 = colX + labelW;
        const x2 = colX + labelW + valueW;
        ctx.page.drawLine({ start: { x: x1, y: top }, end: { x: x1, y: bottom }, thickness: 0.3, color: BORDER });
        ctx.page.drawLine({ start: { x: x2, y: top }, end: { x: x2, y: bottom }, thickness: 0.3, color: BORDER });
        if (c > 0) {
            ctx.page.drawLine({ start: { x: colX, y: top }, end: { x: colX, y: bottom }, thickness: 0.5, color: BORDER });
        }
    }

    block.cells.forEach((cell, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const baseX = ctx.margin + c * colWidth;
        const baseY = top - r * rowHeightPt - cellPaddingPt - labelFontPt;

        ctx.page.drawText(cell.label, {
            x: baseX + cellPaddingPt,
            y: baseY,
            size: labelFontPt,
            font: ctx.fonts.bold,
            color: TEXT,
            maxWidth: labelW - cellPaddingPt * 2,
        });
        const valueText = cell.value;
        const valueWidth = ctx.fonts.regular.widthOfTextAtSize(valueText, valueFontPt);
        const valueRightX = baseX + labelW + valueW - cellPaddingPt - valueWidth;
        ctx.page.drawText(valueText, {
            x: valueRightX,
            y: baseY,
            size: valueFontPt,
            font: ctx.fonts.regular,
            color: TEXT,
        });
        if (cell.unit) {
            ctx.page.drawText(cell.unit, {
                x: baseX + labelW + valueW + cellPaddingPt,
                y: baseY,
                size: unitFontPt,
                font: ctx.fonts.italic,
                color: MUTED,
                maxWidth: unitW - cellPaddingPt * 2,
            });
        }
    });

    ctx.cursorY = bottom - 6;
}

function drawFindings(ctx: Ctx, block: FindingsBlock): void {
    drawSectionBanner(ctx, block.title);

    const { labelFontPt, textFontPt, labelWidthRatio, rowGapPt, rowPaddingPt } = reportLayout.findings;
    const labelCol = ctx.contentWidth * labelWidthRatio;
    const textCol = ctx.contentWidth - labelCol - 8;

    for (const row of block.rows) {
        const textLines = wrapText(row.text, ctx.fonts.regular, textFontPt, textCol);
        const rowHeight = rowPaddingPt * 2 + Math.max(labelFontPt, textLines.length * (textFontPt + rowGapPt));
        ensureSpace(ctx, rowHeight);

        const top = ctx.cursorY;
        ctx.page.drawText(row.label, {
            x: ctx.margin,
            y: top - rowPaddingPt - labelFontPt,
            size: labelFontPt,
            font: ctx.fonts.bold,
            color: TEXT,
            maxWidth: labelCol - 6,
        });
        let textY = top - rowPaddingPt - textFontPt;
        for (const line of textLines) {
            ctx.page.drawText(line, {
                x: ctx.margin + labelCol,
                y: textY,
                size: textFontPt,
                font: ctx.fonts.regular,
                color: TEXT,
            });
            textY -= textFontPt + rowGapPt;
        }
        ctx.cursorY -= rowHeight;
    }
}

function drawConclusion(ctx: Ctx, block: ConclusionBlock): void {
    drawSectionBanner(ctx, block.title.toUpperCase());

    const { fontPt, lineHeightPt } = reportLayout.conclusion;
    ctx.cursorY -= 4;
    for (const item of block.items) {
        const lines = wrapText(item, ctx.fonts.regular, fontPt, ctx.contentWidth - 12);
        ensureSpace(ctx, lines.length * lineHeightPt);
        for (const line of lines) {
            ctx.page.drawText(line, {
                x: ctx.margin,
                y: ctx.cursorY - fontPt,
                size: fontPt,
                font: ctx.fonts.regular,
                color: TEXT,
            });
            ctx.cursorY -= lineHeightPt;
        }
    }
}

async function drawSignature(ctx: Ctx, block: SignatureBlock): Promise<void> {
    if (!block.name && !block.subtitle && !block.signatureImageUrl && !block.sipNumber) return;
    const { nameFontPt, subtitleFontPt, marginTopPt } = reportLayout.signature;
    const sigImageHeight = 48;
    const height =
        marginTopPt +
        (block.signatureImageUrl ? sigImageHeight + 4 : 0) +
        (block.name ? nameFontPt + 2 : 0) +
        (block.subtitle ? subtitleFontPt + 2 : 0) +
        (block.sipNumber ? subtitleFontPt + 2 : 0);
    ensureSpace(ctx, height);
    ctx.cursorY -= marginTopPt;

    if (block.signatureImageUrl) {
        const img = await embedLogo(ctx.doc, block.signatureImageUrl);
        if (img) {
            const maxW = 120;
            const scale = Math.min(sigImageHeight / img.height, maxW / img.width);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.page.drawImage(img, {
                x: ctx.margin + ctx.contentWidth - w,
                y: ctx.cursorY - h,
                width: w,
                height: h,
            });
            ctx.cursorY -= h + 4;
        }
    }

    if (block.name) {
        const width = ctx.fonts.bold.widthOfTextAtSize(block.name, nameFontPt);
        ctx.page.drawText(block.name, {
            x: ctx.margin + ctx.contentWidth - width,
            y: ctx.cursorY - nameFontPt,
            size: nameFontPt,
            font: ctx.fonts.bold,
            color: TEXT,
        });
        ctx.cursorY -= nameFontPt + 2;
    }
    if (block.subtitle) {
        const width = ctx.fonts.regular.widthOfTextAtSize(block.subtitle, subtitleFontPt);
        ctx.page.drawText(block.subtitle, {
            x: ctx.margin + ctx.contentWidth - width,
            y: ctx.cursorY - subtitleFontPt,
            size: subtitleFontPt,
            font: ctx.fonts.regular,
            color: MUTED,
        });
        ctx.cursorY -= subtitleFontPt + 2;
    }
    if (block.sipNumber) {
        const text = `SIP: ${block.sipNumber}`;
        const width = ctx.fonts.regular.widthOfTextAtSize(text, subtitleFontPt);
        ctx.page.drawText(text, {
            x: ctx.margin + ctx.contentWidth - width,
            y: ctx.cursorY - subtitleFontPt,
            size: subtitleFontPt,
            font: ctx.fonts.regular,
            color: MUTED,
        });
        ctx.cursorY -= subtitleFontPt + 2;
    }
}

function drawGeneric(ctx: Ctx, block: GenericSectionBlock): void {
    drawSectionBanner(ctx, block.title);

    const labelFont = reportLayout.findings.labelFontPt;
    const textFont = reportLayout.findings.textFontPt;
    const labelCol = ctx.contentWidth * 0.32;
    const valueCol = ctx.contentWidth - labelCol;

    for (const row of block.rows) {
        const lines = wrapText(row.value, ctx.fonts.regular, textFont, valueCol - 6);
        const rowHeight = 4 + Math.max(labelFont, lines.length * (textFont + 2));
        ensureSpace(ctx, rowHeight);

        const top = ctx.cursorY;
        ctx.page.drawRectangle({
            x: ctx.margin,
            y: top - rowHeight,
            width: ctx.contentWidth,
            height: rowHeight,
            borderColor: BORDER,
            borderWidth: 0.3,
            color: WHITE,
        });
        if (row.label) {
            ctx.page.drawText(row.label, {
                x: ctx.margin + 3,
                y: top - 2 - labelFont,
                size: labelFont,
                font: ctx.fonts.bold,
                color: TEXT,
                maxWidth: labelCol - 6,
            });
        }
        let textY = top - 2 - textFont;
        for (const line of lines) {
            ctx.page.drawText(line, {
                x: ctx.margin + (row.label ? labelCol : 3),
                y: textY,
                size: textFont,
                font: ctx.fonts.regular,
                color: TEXT,
            });
            textY -= textFont + 2;
        }
        ctx.cursorY -= rowHeight;
    }
}

async function drawBlock(ctx: Ctx, block: RenderBlock): Promise<void> {
    switch (block.kind) {
        case 'hospital_header':
            await drawHospitalHeader(ctx, block);
            return;
        case 'report_title':
            drawReportTitle(ctx, block);
            return;
        case 'info_grid':
            drawInfoGrid(ctx, block);
            return;
        case 'measurements':
            drawMeasurements(ctx, block);
            return;
        case 'findings':
            drawFindings(ctx, block);
            return;
        case 'conclusion':
            drawConclusion(ctx, block);
            return;
        case 'signature':
            await drawSignature(ctx, block);
            return;
        case 'generic':
            drawGeneric(ctx, block);
            return;
    }
}

/**
 * Render a plan to PDF bytes without touching the DOM. The bytes can be
 * fed to <PdfPreview/> for an in-browser viewer or handed to
 * {@link downloadPdfPlan} for the classic download flow.
 */
export async function renderPlanToPdfBytes(plan: ReportRenderPlan): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const fonts: Fonts = {
        regular: await doc.embedFont(StandardFonts.TimesRoman),
        bold: await doc.embedFont(StandardFonts.TimesRomanBold),
        italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    };

    const pageWidth = reportLayout.page.widthPt;
    const pageHeight = reportLayout.page.heightPt;
    const margin = reportLayout.page.marginPt;
    const page = createPage(doc);

    const ctx: Ctx = {
        doc,
        page,
        fonts,
        cursorY: pageHeight - margin,
        contentWidth: pageWidth - margin * 2,
        pageWidth,
        pageHeight,
        margin,
    };

    for (const block of plan.blocks) {
        await drawBlock(ctx, block);
    }

    return doc.save();
}

/**
 * Download flow — kept for callers that explicitly want "Save as".
 * Most UIs should use <PdfPreview/> instead so the file is shown in-browser
 * first and the download is an optional second step.
 */
export async function downloadPdfPlan(plan: ReportRenderPlan): Promise<void> {
    const bytes = await renderPlanToPdfBytes(plan);
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${plan.title.replace(/\s+/g, '_').toLowerCase() || 'report'}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
}

/**
 * @deprecated Use {@link downloadPdfPlan} or {@link renderPlanToPdfBytes}.
 * Kept as an alias so older imports keep working during the Phase 5 rollout.
 */
export const generateTemplatePdf = downloadPdfPlan;
