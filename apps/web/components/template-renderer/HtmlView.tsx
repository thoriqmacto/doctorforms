import Image from 'next/image';
import type { TemplateViewModel } from '@/components/template-renderer/TemplateEngine';

type Props = {
    viewModel: TemplateViewModel;
};

const SECTION_HEADER_NAME = 'header';

function isMeasurementSection(sectionName: string) {
    return /(measurement|calculation|2d|m-mode|doppler|hemodynamic|indices)/i.test(sectionName);
}

function isGeneralSection(sectionName: string) {
    return sectionName.trim().toLowerCase() === 'general';
}

function isFindingsSection(sectionName: string) {
    return sectionName.trim().toLowerCase().startsWith('findings_');
}

function findingsSuffix(sectionName: string) {
    return sectionName.replace(/^findings_/i, '').trim();
}

function isAbsoluteUrl(value: string) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function shouldShowSectionName(section: TemplateViewModel['sections'][number]) {
    return section.fields.some((field) => field.showSectionName);
}

export default function HtmlView({ viewModel }: Props) {
    const PAGE_FIELD_BUDGET = 80;

    const estimateFieldWeight = (field: TemplateViewModel['sections'][number]['fields'][number]) => {
        if (field.type === 'textarea') return 2;
        return 1;
    };

    const headerSection = viewModel.sections.find((section) => section.section.trim().toLowerCase() === SECTION_HEADER_NAME);
    const bodySections = viewModel.sections.filter((section) => section.section.trim().toLowerCase() !== SECTION_HEADER_NAME);
    const mergedBodySections = (() => {
        const findings = bodySections.filter((section) => isFindingsSection(section.section));
        if (findings.length === 0) return bodySections;

        const firstFindingsIndex = bodySections.findIndex((section) => isFindingsSection(section.section));
        const insertAt = bodySections.slice(0, firstFindingsIndex).filter((section) => !isFindingsSection(section.section)).length;
        const mergedFindingsSection = {
            section: 'Findings',
            fields: findings.flatMap((section) => {
                const resultField =
                    section.fields.find((field) => field.type === 'textarea' && field.textareaMode === 'result') ??
                    section.fields.find((field) => field.type === 'textarea') ??
                    section.fields[0];
                if (!resultField) return [];

                return {
                    ...resultField,
                    id: `${resultField.id}-findings-row`,
                    label: findingsSuffix(section.section) || resultField.label,
                };
            }),
        };

        const nonFindings = bodySections.filter((section) => !isFindingsSection(section.section));
        return [
            ...nonFindings.slice(0, insertAt),
            mergedFindingsSection,
            ...nonFindings.slice(insertAt),
        ];
    })();
    const splitSectionsIntoPages = (sections: TemplateViewModel['sections']) => {
        const pages: TemplateViewModel['sections'][] = [];
        let currentPage: TemplateViewModel['sections'] = [];
        let currentWeight = 0;

        sections.forEach((section) => {
            const sectionWeight = section.fields.reduce((sum, field) => sum + estimateFieldWeight(field), 0) + 1;

            if (currentPage.length > 0 && currentWeight + sectionWeight > PAGE_FIELD_BUDGET) {
                pages.push(currentPage);
                currentPage = [];
                currentWeight = 0;
            }

            currentPage.push(section);
            currentWeight += sectionWeight;
        });

        if (currentPage.length > 0) {
            pages.push(currentPage);
        }

        if (pages.length === 0) {
            return [[]] as TemplateViewModel['sections'][];
        }

        return pages;
    };

    const paginatedSections = splitSectionsIntoPages(mergedBodySections);
    const alignClassName = (align?: string) => {
        const normalized = align?.toLowerCase();
        if (normalized === 'left') return 'text-left';
        if (normalized === 'right') return 'text-right';
        return 'text-center';
    };

    const renderFieldValue = (
        field: TemplateViewModel['sections'][number]['fields'][number],
        sectionName: string,
        isHeaderField = false
    ) => {
        const shouldUseHeaderDefault = isHeaderField && field.isStatic && !!field.defaultValue;
        const displayValue = shouldUseHeaderDefault ? field.defaultValue : field.value;

        if (field.type === 'image' || field.type === 'bullseye') {
            if (isAbsoluteUrl(displayValue)) {
                return (
                    <div className={alignClassName(field.style.align)}>
                        <Image
                            src={displayValue}
                            alt={field.label || 'image'}
                            width={160}
                            height={64}
                            unoptimized
                            className="inline-block h-24 w-auto max-w-full border border-black object-contain"
                        />
                    </div>
                );
            }

            return (
                <span className={`font-mono text-[10px] leading-tight text-slate-700 ${alignClassName(field.style.align)}`}>
                    {`<img src="${displayValue}" alt="${field.label || 'image'}" />`}
                </span>
            );
        }

        if (field.type === 'checkbox_group') {
            return <span className={`text-[11px] leading-tight text-slate-900 ${alignClassName(field.style.align)}`}>{displayValue || 'Mocked checkbox selection'}</span>;
        }

        if (field.type === 'textarea') {
            return <p className={`text-[11px] leading-snug text-slate-900 ${alignClassName(field.style.align)}`}>{displayValue}</p>;
        }

        if (isMeasurementSection(sectionName)) {
            return <span className={`text-[10px] font-semibold leading-tight text-slate-900 ${alignClassName(field.style.align)}`}>{displayValue}</span>;
        }

        return <span className={`text-[11px] leading-tight text-slate-900 ${alignClassName(field.style.align)}`}>{displayValue}</span>;
    };

    const renderFieldRow = (
        field: TemplateViewModel['sections'][number]['fields'][number],
        sectionName: string,
        isHeaderField = false
    ) => (
        <tr key={field.id} className="align-top">
            {field.isStatic ? null : (
                <td className="w-[38%] border border-slate-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                    {field.label || 'Field'}
                </td>
            )}
            <td className="border border-slate-400 px-1.5 py-0.5">{renderFieldValue(field, sectionName, isHeaderField)}</td>
        </tr>
    );

    const renderTitleField = (field: TemplateViewModel['sections'][number]['fields'][number]) => {
        const value = field.defaultValue || field.value || field.label;
        const titleTag = field.titleTag || 'h2';


        const headingSizeMap: Record<string, string> = {
            h1: "text-[1.2em] font-bold uppercase",
            h2: "text-[1.1em] font-bold uppercase",
            h3: "text-[1em] font-bold uppercase",
            h4: "text-[0.9em] font-bold",
            h5: "text-[0.8em] font-bold",
            h6: "text-[0.7em] font-bold",
        };

        const baseClass = 'font-["Times_New_Roman"] !font-["Times_New_Roman"] leading-none text-slate-900';
        const sizeClass = headingSizeMap[titleTag] || headingSizeMap.h6;
        const className = `${baseClass} ${sizeClass} ${alignClassName(field.style.align)}`;

        if (titleTag === 'h1') return <h1 key={field.id} className={className}>{value}</h1>;
        if (titleTag === 'h2') return <h2 key={field.id} className={className}>{value}</h2>;
        if (titleTag === 'h3') return <h3 key={field.id} className={className}>{value}</h3>;
        if (titleTag === 'h4') return <h4 key={field.id} className={className}>{value}</h4>;
        if (titleTag === 'h5') return <h5 key={field.id} className={className}>{value}</h5>;
        return <h6 key={field.id} className={className}>{value}</h6>;
    };

    const renderHeaderSection = (section: TemplateViewModel['sections'][number]) => {
        const leftImages = section.fields.filter((field) => field.type === 'image' && field.style.align?.toLowerCase() === 'left');
        const rightImages = section.fields.filter((field) => field.type === 'image' && field.style.align?.toLowerCase() === 'right');
        const centerContent = section.fields.filter(
            (field) => field.type !== 'image' || !['left', 'right'].includes(field.style.align?.toLowerCase())
        );

        return (
            <div className="grid grid-cols-[80px_1fr_80px] items-start gap-2 px-2 py-1">
                <div className="flex min-h-10 flex-col items-start gap-1">
                    {leftImages.map((field) => (
                        <div key={field.id}>{renderFieldValue(field, section.section, true)}</div>
                    ))}
                </div>
                <div className="space-y-1 text-center">
                    {centerContent.map((field) =>
                        field.type === 'title' ? (
                            renderTitleField(field)
                        ) : (
                            <div key={field.id}>{renderFieldValue(field, section.section, true)}</div>
                        )
                    )}
                </div>
                <div className="flex min-h-10 flex-col items-end gap-1">
                    {rightImages.map((field) => (
                        <div key={field.id}>{renderFieldValue(field, section.section, true)}</div>
                    ))}
                </div>
            </div>
        );
    };

    const renderMeasurementSection = (section: TemplateViewModel['sections'][number]) => (
        <section key={section.section} className="break-inside-avoid">
            {shouldShowSectionName(section) ? (
                <h3 className="border border-slate-500 bg-slate-100 px-2 py-0.5 text-center text-xs font-bold uppercase tracking-wide">
                    {section.section}
                </h3>
            ) : null}
            <div className={`grid grid-cols-4 gap-1.5 border border-slate-400 p-1.5 xl:grid-cols-6 ${shouldShowSectionName(section) ? 'border-t-0' : ''}`}>
                {section.fields.map((field) => (
                    <div key={field.id} className="border border-slate-300 bg-slate-50 px-1 py-1">
                        {!field.isStatic && (
                            <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-600">{field.label}</p>
                        )}
                        <div className="mt-0.5 flex items-center gap-1">
                            {renderFieldValue(field, section.section)}
                            {field.measurementUnit ? (
                                <span className="text-[9px] font-medium tracking-wide text-slate-600">{field.measurementUnit}</span>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );

    const renderFindingsSection = (section: TemplateViewModel['sections'][number]) => (
        <section key={section.section} className="break-inside-avoid">
            {shouldShowSectionName(section) ? (
                <h3 className="border border-slate-500 bg-slate-100 px-2 py-0.5 text-center text-xs font-bold uppercase tracking-wide">
                    {section.section}
                </h3>
            ) : null}
            <table className="w-full border-collapse">
                <tbody>
                    {section.fields.map((field) => (
                        <tr key={field.id} className="align-top">
                            <td className="w-[32%] border border-slate-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                                {field.label}
                            </td>
                            <td className="border border-slate-400 px-1.5 py-0.5">
                                {renderFieldValue(
                                    {
                                        ...field,
                                        type: 'textarea',
                                    },
                                    section.section
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );

    const renderGeneralSection = (section: TemplateViewModel['sections'][number]) => {
        return (
            <section key={section.section} className="break-inside-avoid">
                {shouldShowSectionName(section) ? (
                    <h3 className="border border-slate-500 bg-slate-100 px-2 py-0.5 text-center text-xs font-bold uppercase tracking-wide">
                        {section.section}
                    </h3>
                ) : null}
                <div className={`grid grid-cols-4 gap-1.5 border border-slate-400 p-1.5 ${shouldShowSectionName(section) ? 'border-t-0' : ''}`}>
                    {section.fields.map((field) => (
                        <div key={field.id} className="border border-slate-300 bg-slate-50 px-1 py-1">
                            {!field.isStatic && (
                                <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-600">{field.label}</p>
                            )}
                            <div className="mt-0.5">{renderFieldValue(field, section.section)}</div>
                        </div>
                    ))}
                </div>
            </section>
        );
    };

    return (
        <div className="space-y-5">
            {paginatedSections.map((pageSections, pageIndex) => (
                <article
                    key={`page-${pageIndex}`}
                    className="page-a4 mx-auto overflow-hidden border border-slate-400 bg-white !pt-[8mm] !pl-[4mm] !pr-[4mm] text-slate-900 shadow-sm"
                >
                    <header className="mb-2">
                        <div className="px-2 py-1">
                            {headerSection ? (
                                renderHeaderSection(headerSection)
                            ) : (
                                <p className="text-[11px] leading-tight text-slate-600">
                                    Header section is required and will repeat on each printed page.
                                </p>
                            )}
                        </div>
                    </header>

                    <div className="space-y-2">
                        {pageSections.map((section) =>
                            section.section.trim().toLowerCase() === 'findings' ? (
                                renderFindingsSection(section)
                            ) : isMeasurementSection(section.section) ? (
                                renderMeasurementSection(section)
                            ) : isGeneralSection(section.section) ? (
                                renderGeneralSection(section)
                            ) : (
                                <section key={`${section.section}-${pageIndex}`} className="break-inside-avoid">
                                    <h3 className="border border-slate-500 bg-slate-100 px-2 py-0.5 text-center text-xs font-bold uppercase tracking-wide">
                                        {section.section}
                                    </h3>
                                    <table className="w-full border-collapse">
                                        <tbody>{section.fields.map((field) => renderFieldRow(field, section.section))}</tbody>
                                    </table>
                                </section>
                            )
                        )}
                    </div>

                    <footer className="mt-2 border-t border-slate-300 pt-1 text-right text-[10px] text-slate-500">
                        Page {pageIndex + 1} / {paginatedSections.length}
                    </footer>
                </article>
            ))}
        </div>
    );
}
