import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { pdfConfig } from '@/config/pdf';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generatePatientPdf(detail: any) {
    const doc = await PDFDocument.create();

    const page = doc.addPage([pdfConfig.page.width, pdfConfig.page.height]);
    const { height } = page.getSize();
    const margin = pdfConfig.page.margin;

    const font = await doc.embedFont(StandardFonts.Helvetica);

    const drawText = (text: string, x: number, y: number, size = 10) => {
        page.drawText(text ?? '', { x, y, size, font, color: rgb(0, 0, 0) });
    };

    // Header
    drawText('Echocardiography Report', margin, height - margin, 16);

    // Patient info (adapt fields according to your API response)
    const data = detail?.data ?? {};
    const attrs = data.attributes ?? {};
    let cursorY = height - margin - 24;

    const lines: string[] = [
        `Patient: ${attrs.name ?? attrs.values?.patient_name ?? '-'}`,
        `MRN: ${attrs.mrn ?? '-'}`,
        `Template ID: ${data.relationships?.template?.data?.id ?? '-'}`,
        '',
        '---- Values ----',
    ];

    (Object.entries(attrs.values ?? {}) as [string, unknown][]).forEach(([k, v]) => {
        lines.push(`${k}: ${String(v)}`);
    });

    lines.forEach((line) => {
        drawText(line, margin, cursorY);
        cursorY -= 14;
    });

    const bytes = await doc.save();

    // Download in browser
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `patient_${data.id}.pdf`; a.click();
    URL.revokeObjectURL(url);
}

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
