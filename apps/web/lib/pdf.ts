import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function generatePatientPdf(detail: any) {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]); // A4 points (72 dpi) 210mm x 297mm
    const { width, height } = page.getSize();
    const margin = 34; // ~12mm
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

    (Object.entries(attrs.values ?? {}) as [string, any][]).forEach(([k, v]) => {
        lines.push(`${k}: ${String(v)}`);
    });

    lines.forEach((line) => {
        drawText(line, margin, cursorY);
        cursorY -= 14;
    });

    const bytes = await doc.save();

    // Download in browser
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `patient_${data.id}.pdf`; a.click();
    URL.revokeObjectURL(url);
}
