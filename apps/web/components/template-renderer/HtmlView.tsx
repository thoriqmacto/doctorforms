import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import type {
    ConclusionBlock,
    FindingsBlock,
    GenericSectionBlock,
    HospitalHeaderBlock,
    InfoGridBlock,
    MeasurementsBlock,
    MeasurementImagesBlock,
    RenderBlock,
    ReportRenderPlan,
    ReportTitleBlock,
    SignatureBlock,
    StructuredHeader,
} from '@/lib/template-renderer/renderPlan';
import { arrangeMeasurementCellsColumnMajor } from '@/lib/template-renderer/renderPlan';
import {
    ALIGN_HTML_CLASS,
    FONT_SIZE_HTML_CLASS,
    FONT_WEIGHT_HTML_CLASS,
    IMAGE_SIZE_PX,
    SPACING_HTML_CLASS,
} from '@/lib/template-renderer/schema';
import { resolveAssetUrl } from '@/lib/assetUrl';
import {
    DEFAULT_PDF_LAYOUT_CONFIG,
    pdfLayoutConfigToCssVars,
    type PdfLayoutConfig,
} from '@/lib/template-renderer/pdfLayoutConfig';

type Props = {
    plan: ReportRenderPlan;
    /**
     * Optional layout config. Falls back to the historical defaults so
     * existing reports render exactly as before.
     */
    layoutConfig?: PdfLayoutConfig;
};

function isAbsoluteUrl(value: string | undefined): value is string {
    if (!value) return false;
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function HospitalHeader({ block }: { block: HospitalHeaderBlock }) {
    // Structured path — built from templates.header_config.
    if (block.structured) return <StructuredHospitalHeader header={block.structured} />;

    // Legacy path — built from hospital context alone.
    return (
        <div className="grid grid-cols-[72px_1fr_72px] items-center gap-3 border-b border-slate-500 px-2 py-2">
            <div className="flex items-center justify-start">
                {isAbsoluteUrl(block.leftLogoUrl) ? (
                    <Image
                        src={block.leftLogoUrl}
                        alt="Hospital logo"
                        width={64}
                        height={64}
                        unoptimized
                        className="h-16 w-16 object-contain"
                    />
                ) : null}
            </div>
            <div className="space-y-0.5 text-center">
                {block.topLine ? (
                    <p className="text-[11px] font-bold uppercase leading-tight text-slate-900">{block.topLine}</p>
                ) : null}
                {block.title ? (
                    <p className="text-[13px] font-bold uppercase leading-tight text-slate-900">{block.title}</p>
                ) : null}
                {(block.contactLines ?? []).map((line, idx) => (
                    <p key={idx} className="text-[8px] leading-tight text-slate-800">
                        {line}
                    </p>
                ))}
                {block.city ? (
                    <p className="text-[11px] font-bold uppercase leading-tight text-slate-900">{block.city}</p>
                ) : null}
            </div>
            <div className="flex items-center justify-end">
                {isAbsoluteUrl(block.rightLogoUrl) ? (
                    <Image
                        src={block.rightLogoUrl}
                        alt="Secondary logo"
                        width={64}
                        height={64}
                        unoptimized
                        className="h-16 w-16 object-contain"
                    />
                ) : null}
            </div>
        </div>
    );
}

function StructuredHospitalHeader({ header }: { header: StructuredHeader }) {
    const leftSize = header.leftLogo ? IMAGE_SIZE_PX[header.leftLogo.size] : 64;
    const rightSize = header.rightLogo ? IMAGE_SIZE_PX[header.rightLogo.size] : 64;
    const borderCls = header.divider ? 'border-b border-slate-500' : '';

    return (
        <div
            className={`grid items-center gap-3 px-2 py-2 ${borderCls}`}
            style={{ gridTemplateColumns: `${leftSize}px 1fr ${rightSize}px` }}
        >
            <div className="flex items-center justify-start">
                {header.leftLogo?.visible && isAbsoluteUrl(header.leftLogo.url) ? (
                    <Image
                        src={header.leftLogo.url}
                        alt="Left logo"
                        width={leftSize}
                        height={leftSize}
                        unoptimized
                        style={{ height: leftSize, width: leftSize }}
                        className="object-contain"
                    />
                ) : null}
            </div>
            <div>
                {header.lines.map((line, idx) => (
                    <p
                        key={idx}
                        className={[
                            line.font ? FONT_SIZE_HTML_CLASS[line.font] : 'text-[10px]',
                            line.weight ? FONT_WEIGHT_HTML_CLASS[line.weight] : 'font-normal',
                            line.align ? ALIGN_HTML_CLASS[line.align] : 'text-center',
                            line.marginTop ? SPACING_HTML_CLASS[line.marginTop] : '',
                            'leading-tight text-slate-900',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                    >
                        {line.text}
                    </p>
                ))}
            </div>
            <div className="flex items-center justify-end">
                {header.rightLogo?.visible && isAbsoluteUrl(header.rightLogo.url) ? (
                    <Image
                        src={header.rightLogo.url}
                        alt="Right logo"
                        width={rightSize}
                        height={rightSize}
                        unoptimized
                        style={{ height: rightSize, width: rightSize }}
                        className="object-contain"
                    />
                ) : null}
            </div>
        </div>
    );
}

function ReportTitle({ block }: { block: ReportTitleBlock }) {
    return (
        <h2 className="mb-1 text-center text-[15px] font-bold leading-tight text-slate-900">
            {block.text}
        </h2>
    );
}

function InfoGrid({ block }: { block: InfoGridBlock }) {
    return (
        <div className="grid grid-cols-2 border border-slate-500">
            {block.columns.map((column, colIdx) => (
                <div
                    key={colIdx}
                    className={`p-2 ${colIdx < block.columns.length - 1 ? 'border-r border-slate-500' : ''}`}
                >
                    <table className="w-full border-collapse text-[11px]">
                        <tbody>
                            {column.map((row, rowIdx) => (
                                <tr key={rowIdx} className="align-top">
                                    <td className="w-[40%] py-0.5 pr-1 font-semibold text-slate-900">{row.label}</td>
                                    <td className="py-0.5 pr-1 text-slate-900">: {row.value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
}

function SectionBanner({ title, uppercase = false }: { title: string; uppercase?: boolean }) {
    return (
        <div
            className={`border border-slate-500 bg-slate-100 px-2 py-0.5 text-center text-[11px] font-bold tracking-wide text-slate-900 ${uppercase ? 'uppercase' : ''}`}
        >
            {title}
        </div>
    );
}

function Measurements({ block }: { block: MeasurementsBlock }) {
    // Column-major layout (matches the RSUD Soedarso reference): the
    // template field order fills the first column top-to-bottom, then
    // moves to the next column. The shared helper also pads short
    // inputs with `undefined` so empty grid cells keep alignment.
    const rowsOfCells = arrangeMeasurementCellsColumnMajor(block.cells, block.cols, 8);
    return (
        <section className="break-inside-avoid">
            <SectionBanner title={block.title ?? 'Measurements & Calculations'} />
            <table className="w-full border-collapse border border-slate-500 text-[10px]">
                <tbody>
                    {rowsOfCells.map((row, rowIdx) => {
                        const tds: ReactNode[] = [];
                        for (let colIdx = 0; colIdx < block.cols; colIdx++) {
                            const cell = row[colIdx];
                            if (!cell) {
                                tds.push(
                                    <td key={`${colIdx}-empty`} colSpan={3} className="border border-slate-400 px-1 py-0.5" />
                                );
                                continue;
                            }
                            tds.push(
                                <td key={`${colIdx}-l`} className="w-[14%] border border-slate-400 px-1 py-0.5 font-semibold text-slate-900">
                                    {cell.label}
                                </td>,
                                <td key={`${colIdx}-v`} className="w-[12%] border border-slate-400 px-1 py-0.5 text-right text-slate-900">
                                    {cell.value}
                                </td>,
                                <td key={`${colIdx}-u`} className="w-[8%] border border-slate-400 px-1 py-0.5 text-slate-700">
                                    {cell.unit}
                                </td>
                            );
                        }
                        return <tr key={rowIdx}>{tds}</tr>;
                    })}
                </tbody>
            </table>
        </section>
    );
}

function MeasurementImages({ block }: { block: MeasurementImagesBlock }) {
    if (!block.images || block.images.length === 0) return null;
    return (
        <section className="break-inside-avoid">
            {block.title ? <SectionBanner title={block.title} /> : null}
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                {block.images.map((img) => {
                    const src = resolveAssetUrl(img.url);
                    if (!src) return null;
                    return (
                        <figure key={img.id} className="rounded border border-slate-300 bg-white p-1">
                            <Image
                                src={src}
                                alt={img.caption ?? `Report image ${img.id}`}
                                width={320}
                                height={240}
                                unoptimized
                                className="h-auto w-full object-contain"
                            />
                            {img.caption ? (
                                <figcaption className="mt-1 truncate text-[9px] text-slate-700">
                                    {img.caption}
                                </figcaption>
                            ) : null}
                        </figure>
                    );
                })}
            </div>
        </section>
    );
}

function Findings({ block }: { block: FindingsBlock }) {
    return (
        <section className="break-inside-avoid">
            <SectionBanner title={block.title} />
            <table className="w-full border-collapse text-[11px]">
                <tbody>
                    {block.rows.map((row, idx) => (
                        <tr key={idx} className="align-top">
                            <td className="w-[24%] py-0.5 pr-2 font-semibold text-slate-900">{row.label}</td>
                            <td className="py-0.5 text-slate-900">{row.text}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}

function Conclusion({ block }: { block: ConclusionBlock }) {
    return (
        <section className="break-inside-avoid">
            <SectionBanner title={block.title} uppercase />
            <ul className="list-none space-y-0.5 px-2 py-1 text-[11px] leading-snug text-slate-900">
                {block.items.map((item, idx) => {
                    if (item.kind === 'extra') {
                        // textarea_free secondary — bold label, regular
                        // content, indented to match the Generic block.
                        return (
                            <li key={idx} className="mt-1 pl-4">
                                <div className="font-semibold text-slate-900">{item.label}</div>
                                <div className="text-slate-900">{item.text}</div>
                            </li>
                        );
                    }
                    return <li key={idx}>{item.text}</li>;
                })}
            </ul>
        </section>
    );
}

function Signature({ block }: { block: SignatureBlock }) {
    if (!block.name && !block.subtitle && !block.signatureImageUrl && !block.sipNumber) return null;
    const signatureSrc = resolveAssetUrl(block.signatureImageUrl);
    return (
        <section className="mt-8 break-inside-avoid px-2 text-right text-[11px]">
            {signatureSrc ? (
                <Image
                    src={signatureSrc}
                    alt="Signature"
                    width={120}
                    height={48}
                    unoptimized
                    className="ml-auto h-12 w-auto object-contain"
                />
            ) : null}
            {block.name ? <p className="font-semibold text-slate-900">{block.name}</p> : null}
            {block.subtitle ? <p className="text-slate-700">{block.subtitle}</p> : null}
            {block.sipNumber ? <p className="text-slate-700">SIP: {block.sipNumber}</p> : null}
        </section>
    );
}

function Generic({ block }: { block: GenericSectionBlock }) {
    return (
        <section className="break-inside-avoid">
            <SectionBanner title={block.title} />
            <table className="w-full border-collapse text-[11px]">
                <tbody>
                    {block.rows.map((row, idx) => (
                        <tr key={idx} className="align-top">
                            {row.label !== undefined ? (
                                <td className="w-[32%] border border-slate-400 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-slate-700">
                                    {row.label}
                                </td>
                            ) : null}
                            <td className="border border-slate-400 px-1.5 py-0.5 text-slate-900" colSpan={row.label !== undefined ? 1 : 2}>
                                <div>{row.value}</div>
                                {row.extra ? (
                                    // textarea_free secondary block — label
                                    // rendered in bold, content in regular,
                                    // both indented so the block visually
                                    // sits inside the parent row.
                                    <div className="mt-1 pl-4">
                                        {row.extraLabel ? (
                                            <div className="font-semibold text-slate-900">
                                                {row.extraLabel}
                                            </div>
                                        ) : null}
                                        <div className="text-slate-900">{row.extra}</div>
                                    </div>
                                ) : null}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}

function renderBlock(block: RenderBlock, key: string | number) {
    switch (block.kind) {
        case 'hospital_header':
            return <HospitalHeader key={key} block={block} />;
        case 'report_title':
            return <ReportTitle key={key} block={block} />;
        case 'info_grid':
            return <InfoGrid key={key} block={block} />;
        case 'measurements':
            return <Measurements key={key} block={block} />;
        case 'measurement_images':
            return <MeasurementImages key={key} block={block} />;
        case 'findings':
            return <Findings key={key} block={block} />;
        case 'conclusion':
            return <Conclusion key={key} block={block} />;
        case 'signature':
            return <Signature key={key} block={block} />;
        case 'generic':
            return <Generic key={key} block={block} />;
    }
}

export default function HtmlView({ plan, layoutConfig }: Props) {
    const config = layoutConfig ?? DEFAULT_PDF_LAYOUT_CONFIG;
    const cssVars = pdfLayoutConfigToCssVars(config);

    // CSS variables drive the visible layout knobs while the existing
    // Tailwind classes provide the structural skeleton. We override the
    // hard-coded padding and add font-size / line-height / block-gap
    // from the normalized config so the panel's sliders take effect on
    // the same DOM the PDF generator inspects.
    const style: CSSProperties = {
        ...cssVars,
        fontFamily: 'Calibri, Carlito, Arial, Helvetica, sans-serif',
        paddingTop: 'var(--report-page-margin-top)',
        paddingRight: 'var(--report-page-margin-right)',
        paddingBottom: 'var(--report-page-margin-bottom)',
        paddingLeft: 'var(--report-page-margin-left)',
        fontSize: 'var(--report-base-font-size)',
        lineHeight: 'var(--report-line-height)',
    };

    return (
        <article
            // `mx-auto` and `page-a4` keep the A4 framing; padding is now
            // driven by CSS variables instead of the historical
            // `!pt-[6mm] !pl-[6mm] !pr-[6mm]` shorthand. Children that
            // already set their own font-size (small print, banners)
            // continue to win because Tailwind's text-[Npx] is more
            // specific than the wrapper's inline font-size.
            className="page-a4 mx-auto flex flex-col overflow-hidden border border-slate-400 bg-white text-slate-900 shadow-sm"
            style={style}
        >
            {plan.blocks.map((block, idx) => (
                <div
                    key={`${block.kind}-${idx}`}
                    style={{ marginBottom: idx === plan.blocks.length - 1 ? 0 : 'var(--report-section-gap)' }}
                >
                    {renderBlock(block, `${block.kind}-${idx}`)}
                </div>
            ))}
        </article>
    );
}
