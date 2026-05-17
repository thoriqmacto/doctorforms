'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    deleteReportImage,
    updateReportImage,
    uploadReportImage,
} from '@/lib/api';
import { resolveAssetUrl } from '@/lib/assetUrl';
import {
    formatSuggestionsAsText,
    recognizeEchoMeasurements,
    type EchoSuggestion,
    type MeasurementFieldLike,
} from '@/lib/ocr/echoMeasurements';

export type ReportImageRow = {
    id: number;
    template_section_key: string;
    url?: string | null;
    path?: string | null;
    original_filename?: string | null;
    mime?: string | null;
    size_bytes?: number | null;
    include_in_report: boolean;
    sort_order: number;
    /**
     * OCR extraction state. PR D2 ran a synchronous Tesseract pass on
     * upload and dumped the recognised text into extracted_data.raw_text.
     * The frontend uses recognizeEchoMeasurements to derive measurement
     * suggestions from raw_text; suggestions are display-only and the
     * doctor copies them across.
     */
    extraction_status?: 'none' | 'pending' | 'processing' | 'ready' | 'failed';
    extracted_data?: { raw_text?: string; engine?: string; ran_at?: string } | null;
    extraction_error?: string | null;
};

type Props = {
    reportId: string | number;
    sectionKey: string;
    sectionLabel?: string;
    /** Existing rows for this section, hydrated from the report payload. */
    initialImages: ReportImageRow[];
    /** Max images per section. Defaults to 8 if not provided by template. */
    maxImages?: number;
    /** Called after a successful upload/update/delete so the parent can mutate SWR. */
    onChange?: () => void;
    /**
     * Measurement template fields for this section. When provided, the
     * gallery shows a "Recognize measurements" button on each image's
     * OCR panel that runs the echo-measurements recogniser over the raw
     * OCR text. Suggestions are display-only and never auto-applied.
     */
    measurementFields?: MeasurementFieldLike[];
};

const FALLBACK_MAX = 8;

function formatBytes(n: number | null | undefined): string {
    if (!n || n <= 0) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 102.4) / 10} KB`;
    return `${Math.round(n / (1024 * 102.4)) / 10} MB`;
}

export default function ReportImageGallery({
    reportId,
    sectionKey,
    sectionLabel,
    initialImages,
    maxImages,
    onChange,
    measurementFields,
}: Props) {
    const [images, setImages] = useState<ReportImageRow[]>(initialImages);
    const [busy, setBusy] = useState(false);
    // Collapsed by default once there's at least one image, so an open
    // gallery doesn't push the measurements form below the fold while
    // the doctor is just filling out the rest of the section. Empty
    // galleries stay expanded so the upload button is one click away.
    const [collapsed, setCollapsed] = useState(initialImages.length > 0);
    const [previewImage, setPreviewImage] = useState<ReportImageRow | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setImages(initialImages);
    }, [initialImages]);

    const cap = maxImages && maxImages > 0 ? maxImages : FALLBACK_MAX;
    const sorted = useMemo(
        () => [...images].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
        [images],
    );

    async function handleFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        const available = cap - sorted.length;
        if (available <= 0) {
            toast.error(`Maximum ${cap} images per section already reached.`);
            return;
        }
        const accepted = Array.from(files).slice(0, available);
        if (files.length > accepted.length) {
            toast.warning(
                `Only ${accepted.length} of ${files.length} files uploaded. Maximum ${cap} per section.`,
            );
        }
        setBusy(true);
        try {
            const uploaded: ReportImageRow[] = [];
            for (const file of accepted) {
                const res = await uploadReportImage(reportId, sectionKey, file);
                if (res?.data) uploaded.push(res.data as ReportImageRow);
            }
            setImages((prev) => [...prev, ...uploaded]);
            if (uploaded.length > 0) {
                toast.success(`${uploaded.length} image${uploaded.length === 1 ? '' : 's'} uploaded.`);
            }
            onChange?.();
        } catch (e: any) {
            console.error(e);
            toast.error('Failed to upload one or more images.');
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    }

    async function toggleInclude(img: ReportImageRow) {
        const next = !img.include_in_report;
        setImages((prev) => prev.map((r) => (r.id === img.id ? { ...r, include_in_report: next } : r)));
        try {
            await updateReportImage(img.id, { include_in_report: next });
            onChange?.();
        } catch (e) {
            console.error(e);
            setImages((prev) =>
                prev.map((r) => (r.id === img.id ? { ...r, include_in_report: !next } : r)),
            );
            toast.error('Failed to update include flag.');
        }
    }

    async function moveImage(img: ReportImageRow, dir: -1 | 1) {
        const list = [...sorted];
        const idx = list.findIndex((r) => r.id === img.id);
        const target = idx + dir;
        if (idx < 0 || target < 0 || target >= list.length) return;

        const a = list[idx];
        const b = list[target];
        const aOrder = a.sort_order;
        const bOrder = b.sort_order;
        // Optimistic swap.
        setImages((prev) =>
            prev.map((r) => {
                if (r.id === a.id) return { ...r, sort_order: bOrder };
                if (r.id === b.id) return { ...r, sort_order: aOrder };
                return r;
            }),
        );
        try {
            await updateReportImage(a.id, { sort_order: bOrder });
            await updateReportImage(b.id, { sort_order: aOrder });
            onChange?.();
        } catch (e) {
            console.error(e);
            // Roll back optimistic update on error.
            setImages((prev) =>
                prev.map((r) => {
                    if (r.id === a.id) return { ...r, sort_order: aOrder };
                    if (r.id === b.id) return { ...r, sort_order: bOrder };
                    return r;
                }),
            );
            toast.error('Failed to reorder images.');
        }
    }

    async function removeImage(img: ReportImageRow) {
        if (!window.confirm('Remove this image from the report?')) return;
        const snapshot = images;
        setImages((prev) => prev.filter((r) => r.id !== img.id));
        try {
            await deleteReportImage(img.id);
            toast.success('Image removed.');
            onChange?.();
        } catch (e) {
            console.error(e);
            setImages(snapshot);
            toast.error('Failed to remove image.');
        }
    }

    return (
        <Card data-component="report-image-gallery">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">
                    {sectionLabel || sectionKey} — images
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                        {sorted.length} / {cap}
                    </span>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy || sorted.length >= cap}
                        onClick={() => {
                            if (collapsed) setCollapsed(false);
                            inputRef.current?.click();
                        }}
                    >
                        {busy ? 'Uploading…' : 'Upload'}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-expanded={!collapsed}
                        onClick={() => setCollapsed((v) => !v)}
                    >
                        {collapsed ? 'Expand' : 'Collapse'}
                    </Button>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files)}
                    />
                </div>
            </CardHeader>
            {collapsed ? null : (
            <CardContent>
                {sorted.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                        No images yet. Upload screenshots or photos relevant to this measurement section.
                    </p>
                ) : (
                    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                        {sorted.map((img, idx) => {
                            const src = resolveAssetUrl(img.url ?? img.path ?? undefined);
                            return (
                                <li
                                    key={img.id}
                                    className="space-y-2 rounded border bg-muted/30 p-2 text-xs"
                                >
                                    <button
                                        type="button"
                                        className="group relative block aspect-square w-full overflow-hidden rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                        onClick={() => src && setPreviewImage(img)}
                                        aria-label={`Preview ${img.original_filename ?? `image ${img.id}`} at full size`}
                                        disabled={!src}
                                    >
                                        {src ? (
                                            <>
                                                <Image
                                                    src={src}
                                                    alt={img.original_filename ?? `Report image ${img.id}`}
                                                    fill
                                                    unoptimized
                                                    className="object-contain transition-opacity group-hover:opacity-90"
                                                />
                                                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                                                    Click to view full size
                                                </span>
                                            </>
                                        ) : (
                                            <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                                                No preview
                                            </span>
                                        )}
                                    </button>
                                    <div className="truncate" title={img.original_filename ?? undefined}>
                                        {img.original_filename ?? `image-${img.id}`}
                                    </div>
                                    {img.size_bytes ? (
                                        <div className="text-muted-foreground">{formatBytes(img.size_bytes)}</div>
                                    ) : null}
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={img.include_in_report}
                                            onChange={() => toggleInclude(img)}
                                        />
                                        Include in report
                                    </label>
                                    <div className="flex items-center justify-between gap-1">
                                        <div className="flex gap-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                aria-label="Move up"
                                                disabled={idx === 0}
                                                onClick={() => moveImage(img, -1)}
                                            >
                                                ↑
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                aria-label="Move down"
                                                disabled={idx === sorted.length - 1}
                                                onClick={() => moveImage(img, 1)}
                                            >
                                                ↓
                                            </Button>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => removeImage(img)}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                    <OcrPanel image={img} measurementFields={measurementFields} />
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
            )}
            <ImagePreviewDialog
                image={previewImage}
                onOpenChange={(open) => {
                    if (!open) setPreviewImage(null);
                }}
            />
        </Card>
    );
}

function ImagePreviewDialog({
    image,
    onOpenChange,
}: {
    image: ReportImageRow | null;
    onOpenChange: (open: boolean) => void;
}) {
    const src = image ? resolveAssetUrl(image.url ?? image.path ?? undefined) : undefined;
    const title = image?.original_filename ?? (image ? `Report image ${image.id}` : '');
    return (
        <Dialog open={!!image} onOpenChange={onOpenChange}>
            <DialogContent
                // Stretch wider than the default 32rem so high-res echo
                // screenshots aren't artificially shrunk before the
                // user gets to scroll. The inner div manages its own
                // scroll so the image displays at natural resolution.
                className="max-w-[min(96vw,1400px)] max-h-[92vh] gap-2 p-4 sm:max-w-[min(96vw,1400px)]"
            >
                <DialogHeader>
                    <DialogTitle className="truncate text-sm">{title}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[80vh] overflow-auto rounded border bg-background">
                    {src ? (
                        // Plain <img> so the browser shows the image at
                        // its natural pixel size; next/image would force
                        // it into a layout box.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={src}
                            alt={title}
                            className="block max-w-none"
                        />
                    ) : (
                        <p className="p-6 text-center text-sm text-muted-foreground">
                            No preview available.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function OcrPanel({
    image,
    measurementFields,
}: {
    image: ReportImageRow;
    measurementFields?: MeasurementFieldLike[];
}) {
    const [open, setOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<EchoSuggestion[] | null>(null);
    const status = image.extraction_status ?? 'none';

    const rawText =
        status === 'ready' ? (image.extracted_data?.raw_text ?? '').trim() : '';
    const isReady = status === 'ready';
    const isFailed = status === 'failed';
    const canRecognize = isReady && rawText.length > 0 && (measurementFields?.length ?? 0) > 0;

    if (status === 'none') return null;

    async function copyValue(value: string, label: string) {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`Copied ${label}: ${value}`);
        } catch (e) {
            console.error(e);
            toast.error('Failed to copy to clipboard.');
        }
    }

    async function copyAll() {
        if (!suggestions || suggestions.length === 0) return;
        try {
            await navigator.clipboard.writeText(formatSuggestionsAsText(suggestions));
            toast.success(`Copied ${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'}.`);
        } catch (e) {
            console.error(e);
            toast.error('Failed to copy to clipboard.');
        }
    }

    function runRecognition() {
        if (!measurementFields || measurementFields.length === 0) return;
        const result = recognizeEchoMeasurements(rawText, measurementFields);
        setSuggestions(result);
        if (result.length === 0) {
            toast.info('No measurements recognised in OCR text.');
        }
    }

    return (
        <div className="space-y-1 rounded bg-muted px-1.5 py-1 text-[10px] text-muted-foreground">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 text-left font-medium"
                aria-expanded={open}
            >
                <span>
                    OCR:{' '}
                    {isReady
                        ? rawText
                            ? `${rawText.length} chars extracted`
                            : 'no text recognised'
                        : isFailed
                          ? 'extraction failed'
                          : status}
                </span>
                <span>{open ? '−' : '+'}</span>
            </button>
            {open && isReady && rawText ? (
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-background p-1 font-mono text-[10px] text-foreground">
                    {rawText}
                </pre>
            ) : null}
            {open && isFailed && image.extraction_error ? (
                <p className="rounded bg-destructive/10 p-1 text-destructive">
                    {image.extraction_error}
                </p>
            ) : null}
            {open && canRecognize ? (
                <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[10px]"
                            onClick={runRecognition}
                        >
                            Recognize measurements
                        </Button>
                        {suggestions && suggestions.length > 0 ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[10px]"
                                onClick={copyAll}
                            >
                                Copy all
                            </Button>
                        ) : null}
                    </div>
                    {suggestions !== null ? (
                        <SuggestionsTable suggestions={suggestions} onCopy={copyValue} />
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

const CONFIDENCE_STYLES: Record<EchoSuggestion['confidence'], string> = {
    high: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    low: 'bg-muted text-muted-foreground',
};

function SuggestionsTable({
    suggestions,
    onCopy,
}: {
    suggestions: EchoSuggestion[];
    onCopy: (value: string, label: string) => void;
}) {
    if (suggestions.length === 0) {
        return (
            <p className="rounded bg-background p-1 text-[10px] italic text-muted-foreground">
                No measurements matched. Try adding image extraction aliases on the template field.
            </p>
        );
    }
    return (
        <table className="w-full table-fixed border-collapse rounded bg-background text-[10px]">
            <thead>
                <tr className="text-left text-muted-foreground">
                    <th className="w-[34%] px-1 py-0.5 font-medium">Parameter</th>
                    <th className="w-[20%] px-1 py-0.5 font-medium">Value</th>
                    <th className="w-[16%] px-1 py-0.5 font-medium">Conf.</th>
                    <th className="px-1 py-0.5 font-medium">Source</th>
                    <th className="w-[14%] px-1 py-0.5"></th>
                </tr>
            </thead>
            <tbody>
                {suggestions.map((s) => {
                    const displayValue = s.unit ? `${s.value} ${s.unit}` : s.value;
                    return (
                        <tr key={s.fieldKey} className="border-t align-top">
                            <td className="px-1 py-0.5 font-medium text-foreground">{s.label}</td>
                            <td className="px-1 py-0.5 text-foreground">{displayValue}</td>
                            <td className="px-1 py-0.5">
                                <span
                                    className={`inline-block rounded px-1 text-[9px] uppercase ${CONFIDENCE_STYLES[s.confidence]}`}
                                >
                                    {s.confidence}
                                </span>
                            </td>
                            <td className="truncate px-1 py-0.5 font-mono text-[9px] text-muted-foreground" title={s.sourceText}>
                                {s.sourceText ?? ''}
                            </td>
                            <td className="px-1 py-0.5 text-right">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 px-1.5 text-[10px]"
                                    onClick={() => onCopy(s.value, s.label)}
                                >
                                    Copy
                                </Button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
