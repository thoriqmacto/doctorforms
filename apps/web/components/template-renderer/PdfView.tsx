'use client';

// Back-compat shim — the full-featured viewer lives in PdfPreview.
// Existing pages still import `PdfView`; they get navigation/zoom/search
// without changing the import path.
export { default } from '@/components/template-renderer/PdfPreview';
