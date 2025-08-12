import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { pdfConfig } from '@/config/pdf';

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
    a.href = url; a.download = `report_${data.id ?? ''}.pdf`; a.click();
    URL.revokeObjectURL(url);
}
