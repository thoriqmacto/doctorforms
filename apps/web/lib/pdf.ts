import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { pdfConfig } from '@/config/pdf';
import type { TemplateViewModel } from '@/components/template-renderer/TemplateEngine';

export async function generateReportPdf(report: any) {
    const doc = await PDFDocument.create();
    const page = doc.addPage([pdfConfig.page.width, pdfConfig.page.height]);
    const { height } = page.getSize();
    const margin = pdfConfig.page.margin;
    const font = await doc.embedFont(StandardFonts.Helvetica);

    const drawText = (text: string, x: number, y: number, size = 10) => {
        page.drawText(text ?? '', { x, y, size, font, color: rgb(0, 0, 0) });
    };

    const data = report?.data ?? report ?? {};
    const meta = data.metadata ?? {};
    const patient = data.patient ?? {};
    const fields = data.fields ?? [];

    drawText(meta.title ?? 'Report', margin, height - margin, 16);

    let cursorY = height - margin - 24;
    const lines: string[] = [
        `Patient: ${patient.name ?? '-'}`,
        `MRN: ${patient.mrn ?? '-'}`,
        '',
        '---- Fields ----',
    ];

    (fields as any[]).forEach((f: any) => {
        const label = f.label ?? f.template_field?.label ?? '';
        lines.push(`${label}: ${String(f.value ?? '')}`);
    });

    lines.forEach((line) => {
        drawText(line, margin, cursorY);
        cursorY -= 14;
    });

    const bytes = await doc.save();

    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${data.id ?? ''}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
}

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 56;

export async function generateTemplatePdf(viewModel: TemplateViewModel) {
    const doc = await PDFDocument.create();
    const helvetica = await doc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const headerSection = viewModel.sections.find((section) => section.section.trim().toLowerCase() === 'header');
    const bodySections = viewModel.sections.filter((section) => section.section.trim().toLowerCase() !== 'header');

    let page = doc.addPage([A4_WIDTH, A4_HEIGHT]);
    let cursorY = A4_HEIGHT - MARGIN;

    const nextLine = (size: number, gap = 6) => {
        cursorY -= size + gap;
    };

    const drawHeader = () => {
        page.drawText('Medical Report Preview', {
            x: MARGIN,
            y: cursorY,
            size: 9,
            font: helvetica,
            color: rgb(0.42, 0.42, 0.42),
        });
        nextLine(9, 10);

        page.drawText(viewModel.title, {
            x: MARGIN,
            y: cursorY,
            size: 18,
            font: helveticaBold,
            color: rgb(0.1, 0.1, 0.1),
        });
        nextLine(18, 12);

        if (!headerSection) {
            return;
        }

        page.drawText('HEADER', {
            x: MARGIN,
            y: cursorY,
            size: 10,
            font: helveticaBold,
            color: rgb(0.2, 0.2, 0.2),
        });
        nextLine(10, 6);

        for (const field of headerSection.fields) {
            const value = field.isStatic && field.defaultValue ? field.defaultValue : field.value || '—';
            if (!field.isStatic) {
                page.drawText(field.label, {
                    x: MARGIN,
                    y: cursorY,
                    size: 8,
                    font: helveticaBold,
                    color: rgb(0.45, 0.45, 0.45),
                });
                nextLine(8, 3);
            }

            const wrapped = wrapLine(value, 86);
            for (const line of wrapped) {
                page.drawText(line, {
                    x: MARGIN,
                    y: cursorY,
                    size: 10,
                    font: helvetica,
                    color: rgb(0.1, 0.1, 0.1),
                });
                nextLine(10, 2);
            }
            nextLine(0, 5);
        }

        nextLine(0, 8);
    };

    const ensureSpace = (requiredHeight: number) => {
        if (cursorY - requiredHeight < MARGIN) {
            page = doc.addPage([A4_WIDTH, A4_HEIGHT]);
            cursorY = A4_HEIGHT - MARGIN;
            drawHeader();
        }
    };

    const isMeasurementSection = (sectionName: string) =>
        /(measurement|calculation|2d|m-mode|doppler|hemodynamic|indices)/i.test(sectionName);

    drawHeader();

    for (const section of bodySections) {
        ensureSpace(40);
        page.drawText(section.section.toUpperCase(), {
            x: MARGIN,
            y: cursorY,
            size: 10,
            font: helveticaBold,
            color: rgb(0.2, 0.2, 0.2),
        });
        nextLine(10, 8);

        if (isMeasurementSection(section.section)) {
            const columns = 4;
            const gap = 6;
            const cellWidth = (A4_WIDTH - MARGIN * 2 - gap * (columns - 1)) / columns;
            const cellHeight = 28;
            const rows = Math.ceil(section.fields.length / columns);
            ensureSpace(rows * (cellHeight + gap));

            section.fields.forEach((field, idx) => {
                const col = idx % columns;
                const row = Math.floor(idx / columns);
                const x = MARGIN + col * (cellWidth + gap);
                const y = cursorY - row * (cellHeight + gap);
                const value = field.isStatic && field.defaultValue ? field.defaultValue : field.value || '—';

                if (!field.isStatic) {
                    page.drawText(field.label.slice(0, 16), {
                        x,
                        y,
                        size: 7,
                        font: helveticaBold,
                        color: rgb(0.45, 0.45, 0.45),
                    });
                }

                page.drawText(value.slice(0, 20), {
                    x,
                    y: y - 10,
                    size: 9,
                    font: helvetica,
                    color: rgb(0.1, 0.1, 0.1),
                });
            });

            cursorY -= rows * (cellHeight + gap);
            nextLine(0, 8);
            continue;
        }

        for (const field of section.fields) {
            ensureSpace(30);
            const value = field.isStatic && section.section.trim().toLowerCase() === 'header' && field.defaultValue
                ? field.defaultValue
                : field.value || '—';
            if (!field.isStatic) {
                page.drawText(field.label, {
                    x: MARGIN,
                    y: cursorY,
                    size: 8,
                    font: helveticaBold,
                    color: rgb(0.45, 0.45, 0.45),
                });
                nextLine(8, 4);
            }

            const wrapped = wrapLine(value, 86);
            for (const line of wrapped) {
                ensureSpace(16);
                page.drawText(line, {
                    x: MARGIN,
                    y: cursorY,
                    size: 10,
                    font: helvetica,
                    color: rgb(0.1, 0.1, 0.1),
                });
                nextLine(10, 2);
            }

            nextLine(0, 8);
        }

        nextLine(0, 4);
    }

    const bytes = await doc.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${viewModel.title.replace(/\s+/g, '_').toLowerCase()}_preview.pdf`;
    anchor.click();

    URL.revokeObjectURL(url);
}

function wrapLine(text: string, maxChars = 86) {
    if (text.length <= maxChars) return [text];

    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = '';

    words.forEach((word) => {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length <= maxChars) {
            current = candidate;
            return;
        }

        if (current) lines.push(current);
        current = word;
    });

    if (current) lines.push(current);

    return lines;
}
