'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ReportRenderPlan } from '@/lib/template-renderer/renderPlan';
import { downloadPdfPlan, renderPlanToPdfBytes } from '@/lib/pdf';
import PdfLayoutPanel from '@/components/template-renderer/PdfLayoutPanel';
import {
    DEFAULT_PDF_LAYOUT_CONFIG,
    normalizePdfLayoutConfig,
    pdfLayoutConfigToPdfOverrides,
    type PdfLayoutConfig,
} from '@/lib/template-renderer/pdfLayoutConfig';

/*
 * PdfPreview — in-browser PDF viewer with page navigation, zoom, and
 * text search. Replaces the "download-only" PDF mode.
 *
 * Flow:
 *   ReportRenderPlan → renderPlanToPdfBytes (pdf-lib) → Uint8Array
 *                    → pdfjs-dist document
 *                    → render current page to <canvas>
 *                    → overlay matches highlighted via transparent boxes
 *
 * pdfjs-dist worker is loaded via `new Worker(new URL(...))` — the bundler
 * rewrites the URL at build time and the file is served from /_next/static/.
 * No CDN round-trip.
 */

type Props = {
    plan: ReportRenderPlan;
    /** Template id used by the "Save layout" action. When null the panel renders read-only. */
    templateId?: string | number | null;
    /** Layout config persisted on the template. Defaults are used when omitted. */
    initialLayoutConfig?: PdfLayoutConfig | null;
};

import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';

type PdfDocument = PDFDocumentProxy;
type PdfPage = PDFPageProxy;

async function loadPdfjs() {
    const pdfjs = await import('pdfjs-dist');
    // Worker must be set exactly once per page. The `new URL(...)` trick
    // lets Next's bundler fingerprint the worker file.
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        // The bundler rewrites this URL to a hashed path under /_next/static.
        const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    }
    return pdfjs;
}

export default function PdfPreview({ plan, templateId, initialLayoutConfig }: Props) {
    const [status, setStatus] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [doc, setDoc] = useState<PdfDocument | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageCount, setPageCount] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [query, setQuery] = useState('');
    const [matchesPerPage, setMatchesPerPage] = useState<number[]>([]);
    const [activeMatchIndex, setActiveMatchIndex] = useState<number>(-1);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const highlightRef = useRef<HTMLDivElement | null>(null);
    const renderTaskRef = useRef<RenderTask | null>(null);

    // Layout state — `live` reflects the panel's current values (drives
    // the preview), `saved` is the server-persisted baseline (drives the
    // "Reset" action and the dirty badge).
    const normalizedInitial = useMemo(
        () => (initialLayoutConfig ? normalizePdfLayoutConfig(initialLayoutConfig) : DEFAULT_PDF_LAYOUT_CONFIG),
        [initialLayoutConfig],
    );
    const [liveLayout, setLiveLayout] = useState<PdfLayoutConfig>(normalizedInitial);
    const [savedLayout, setSavedLayout] = useState<PdfLayoutConfig>(normalizedInitial);
    useEffect(() => {
        setLiveLayout(normalizedInitial);
        setSavedLayout(normalizedInitial);
    }, [normalizedInitial]);
    const pdfOverrides = useMemo(() => pdfLayoutConfigToPdfOverrides(liveLayout), [liveLayout]);

    /* Stable hash of the plan + layout — regenerates the PDF only when something visible changed. */
    const planSignature = useMemo(
        () => JSON.stringify(plan) + '::' + JSON.stringify(pdfOverrides),
        [plan, pdfOverrides],
    );

    // 1) Generate PDF bytes whenever the plan or layout changes.
    useEffect(() => {
        let cancelled = false;
        setStatus('generating');
        setDoc(null);

        (async () => {
            try {
                const [bytes, pdfjs] = await Promise.all([
                    renderPlanToPdfBytes(plan, pdfOverrides),
                    loadPdfjs(),
                ]);
                if (cancelled) return;
                // pdfjs consumes a Uint8Array; clone to avoid pdf-lib holding a reference.
                const copy = new Uint8Array(bytes);
                const loadingTask = pdfjs.getDocument({ data: copy });
                const loaded = await loadingTask.promise;
                if (cancelled) {
                    loaded.destroy();
                    return;
                }
                setDoc(loaded);
                setPageCount(loaded.numPages);
                setPageNumber(1);
                setStatus('ready');
            } catch (error) {
                console.error('Failed to generate PDF', error);
                if (!cancelled) {
                    setErrorMsg(error instanceof Error ? error.message : 'Unknown error');
                    setStatus('error');
                }
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planSignature]);

    // 2) Render the current page to the canvas.
    const renderPage = useCallback(
        async (pdfDoc: PdfDocument, pageNo: number, scale: number) => {
            renderTaskRef.current?.cancel();
            const page: PdfPage = await pdfDoc.getPage(pageNo);
            const viewport = page.getViewport({ scale });
            const canvas = canvasRef.current;
            if (!canvas) return;
            const devicePixelRatio = window.devicePixelRatio || 1;
            canvas.width = viewport.width * devicePixelRatio;
            canvas.height = viewport.height * devicePixelRatio;
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
            const task = page.render({ canvasContext: ctx, viewport, canvas });
            renderTaskRef.current = task;
            try {
                await task.promise;
            } catch (error) {
                const err = error as { name?: string };
                if (err?.name !== 'RenderingCancelledException') throw error;
            }

            // Text layer for search highlights — overlay transparent boxes
            // over matching tokens. We keep it lightweight: no selectable
            // text layer, just highlight rectangles.
            const container = highlightRef.current;
            if (!container) return;
            container.innerHTML = '';
            container.style.width = `${viewport.width}px`;
            container.style.height = `${viewport.height}px`;
            if (!query.trim()) return;
            const textContent = await page.getTextContent();
            const needle = query.toLowerCase();
            textContent.items.forEach((item) => {
                if (!('str' in item) || typeof item.str !== 'string') return;
                const haystack = item.str.toLowerCase();
                if (!haystack.includes(needle)) return;
                // The transform is [a b c d e f]; e,f = position; d scales height.
                const [, , , d, e, f] = item.transform as number[];
                const width = (item.width ?? 0) * scale;
                const height = Math.abs(d) * scale;
                const x = e * scale;
                const y = viewport.height - f * scale - height;
                const box = document.createElement('div');
                box.style.position = 'absolute';
                box.style.left = `${x}px`;
                box.style.top = `${y}px`;
                box.style.width = `${width}px`;
                box.style.height = `${height}px`;
                box.style.backgroundColor = 'rgba(250, 204, 21, 0.45)'; // amber-400/45
                box.style.pointerEvents = 'none';
                container.appendChild(box);
            });
            // pdfDoc reference kept so future enhancements (e.g. outline)
            // can hang off the document without another fetch.
            void pdfDoc;
        },
        [query],
    );

    useEffect(() => {
        if (!doc || status !== 'ready') return;
        renderPage(doc, pageNumber, zoom).catch((error) => {
            console.error('Failed to render PDF page', error);
        });
    }, [doc, pageNumber, zoom, renderPage, status]);

    // 3) Count matches per page when query changes so we can show "3 of 12".
    useEffect(() => {
        let cancelled = false;
        if (!doc || !query.trim()) {
            setMatchesPerPage([]);
            setActiveMatchIndex(-1);
            return;
        }
        (async () => {
            const needle = query.toLowerCase();
            const counts: number[] = [];
            for (let p = 1; p <= doc.numPages; p++) {
                if (cancelled) return;
                const page = await doc.getPage(p);
                const content = await page.getTextContent();
                let count = 0;
                content.items.forEach((item) => {
                    if (!('str' in item) || typeof item.str !== 'string') return;
                    const hay = item.str.toLowerCase();
                    if (!hay.length) return;
                    let idx = 0;
                    while ((idx = hay.indexOf(needle, idx)) !== -1) {
                        count++;
                        idx += needle.length || 1;
                    }
                });
                counts.push(count);
            }
            if (!cancelled) {
                setMatchesPerPage(counts);
                const total = counts.reduce((s, n) => s + n, 0);
                setActiveMatchIndex(total > 0 ? 0 : -1);
                // Jump to first page with a hit.
                const firstHitPage = counts.findIndex((c) => c > 0) + 1;
                if (firstHitPage > 0 && firstHitPage !== pageNumber) {
                    setPageNumber(firstHitPage);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [doc, query]);

    const totalMatches = matchesPerPage.reduce((s, n) => s + n, 0);

    function gotoMatch(direction: 1 | -1) {
        if (totalMatches === 0) return;
        const next = (activeMatchIndex + direction + totalMatches) % totalMatches;
        setActiveMatchIndex(next);
        // Find the page carrying this match index.
        let consumed = 0;
        for (let p = 0; p < matchesPerPage.length; p++) {
            if (next < consumed + matchesPerPage[p]) {
                setPageNumber(p + 1);
                return;
            }
            consumed += matchesPerPage[p];
        }
    }

    // Cleanup on unmount.
    useEffect(() => {
        return () => {
            renderTaskRef.current?.cancel();
            doc?.destroy?.();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>PDF View</CardTitle>
                <CardDescription>
                    In-browser PDF preview with page navigation, zoom, and text
                    search. Uses the same render plan as HTML mode.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <PdfLayoutPanel
                    templateId={templateId ?? null}
                    value={liveLayout}
                    onChange={setLiveLayout}
                    savedValue={savedLayout}
                    onSaved={(saved) => setSavedLayout(saved)}
                    disabled={status === 'error'}
                />
                {/* Toolbar ---------------------------------------------------- */}
                <div className="flex flex-wrap items-center gap-2 border-b pb-3">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setPageNumber((n) => Math.max(1, n - 1))}
                        disabled={status !== 'ready' || pageNumber <= 1}
                    >
                        Prev
                    </Button>
                    <span className="text-sm tabular-nums">
                        {status === 'ready' ? `${pageNumber} / ${pageCount}` : '— / —'}
                    </span>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setPageNumber((n) => Math.min(pageCount, n + 1))}
                        disabled={status !== 'ready' || pageNumber >= pageCount}
                    >
                        Next
                    </Button>

                    <div className="mx-2 h-5 w-px bg-border" />

                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                        disabled={status !== 'ready'}
                    >
                        −
                    </Button>
                    <span className="w-12 text-center text-sm tabular-nums">
                        {Math.round(zoom * 100)}%
                    </span>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                        disabled={status !== 'ready'}
                    >
                        +
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setZoom(1)}
                        disabled={status !== 'ready' || zoom === 1}
                    >
                        Reset
                    </Button>

                    <div className="mx-2 h-5 w-px bg-border" />

                    <div className="flex items-center gap-1">
                        <Input
                            type="search"
                            placeholder="Search text…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="h-8 w-48"
                            disabled={status !== 'ready'}
                        />
                        <span className="w-16 text-xs text-muted-foreground tabular-nums">
                            {query.trim() && totalMatches > 0
                                ? `${activeMatchIndex + 1} / ${totalMatches}`
                                : query.trim()
                                  ? '0 / 0'
                                  : ''}
                        </span>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => gotoMatch(-1)}
                            disabled={totalMatches === 0}
                        >
                            ↑
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => gotoMatch(1)}
                            disabled={totalMatches === 0}
                        >
                            ↓
                        </Button>
                    </div>

                    <div className="ml-auto">
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => downloadPdfPlan(plan, pdfOverrides)}
                            disabled={status !== 'ready'}
                        >
                            Download PDF
                        </Button>
                    </div>
                </div>

                {/* Canvas --------------------------------------------------- */}
                <div className="flex max-h-[80vh] justify-center overflow-auto rounded-md border bg-muted/40 p-4">
                    {status === 'generating' ? (
                        <p className="text-sm text-muted-foreground">Generating PDF…</p>
                    ) : status === 'error' ? (
                        <div className="space-y-2 text-sm text-red-700">
                            <p>Failed to render PDF.</p>
                            <p className="text-xs text-muted-foreground">{errorMsg}</p>
                            <Button type="button" size="sm" variant="outline" onClick={() => downloadPdfPlan(plan, pdfOverrides)}>
                                Download PDF instead
                            </Button>
                        </div>
                    ) : (
                        <div className="relative">
                            <canvas ref={canvasRef} className="block shadow-md" />
                            <div
                                ref={highlightRef}
                                className="pointer-events-none absolute left-0 top-0"
                                aria-hidden="true"
                            />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
