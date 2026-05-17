'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    deleteReportImage,
    updateReportImage,
    uploadReportImage,
} from '@/lib/api';
import { resolveAssetUrl } from '@/lib/assetUrl';

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
    /** Extension point for the OCR sprint (PR D2). Today always 'none'. */
    extraction_status?: 'none' | 'pending' | 'processing' | 'ready' | 'failed';
    extracted_data?: unknown;
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
}: Props) {
    const [images, setImages] = useState<ReportImageRow[]>(initialImages);
    const [busy, setBusy] = useState(false);
    // Collapsed by default once there's at least one image, so an open
    // gallery doesn't push the measurements form below the fold while
    // the doctor is just filling out the rest of the section. Empty
    // galleries stay expanded so the upload button is one click away.
    const [collapsed, setCollapsed] = useState(initialImages.length > 0);
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
                                    <div className="relative aspect-square overflow-hidden rounded bg-background">
                                        {src ? (
                                            <Image
                                                src={src}
                                                alt={img.original_filename ?? `Report image ${img.id}`}
                                                fill
                                                unoptimized
                                                className="object-contain"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                                No preview
                                            </div>
                                        )}
                                    </div>
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
                                    {/*
                                        Extraction status placeholder for the
                                        OCR sprint (PR D2). Today extraction_status
                                        is always 'none' so this never renders.
                                    */}
                                    {img.extraction_status && img.extraction_status !== 'none' ? (
                                        <div className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                            Extraction: {img.extraction_status}
                                        </div>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
            )}
        </Card>
    );
}
