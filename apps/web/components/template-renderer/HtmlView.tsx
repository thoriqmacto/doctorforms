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

function isAbsoluteUrl(value: string) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

export default function HtmlView({ viewModel }: Props) {
    const PAGE_FIELD_BUDGET = 42;

    const estimateFieldWeight = (field: TemplateViewModel['sections'][number]['fields'][number]) => {
        if (field.type === 'textarea') return 2;
        return 1;
    };

    const headerSection = viewModel.sections.find((section) => section.section.trim().toLowerCase() === SECTION_HEADER_NAME);
    const bodySections = viewModel.sections.filter((section) => section.section.trim().toLowerCase() !== SECTION_HEADER_NAME);
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

    const paginatedSections = splitSectionsIntoPages(bodySections);

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
                    <Image
                        src={displayValue}
                        alt={field.label || 'image'}
                        width={160}
                        height={64}
                        unoptimized
                        className="h-16 w-auto max-w-full rounded border border-slate-300 object-contain"
                    />
                );
            }

            return (
                <span className="font-mono text-[10px] leading-tight text-slate-700">
                    {`<img src="${displayValue}" alt="${field.label || 'image'}" />`}
                </span>
            );
        }

        if (field.type === 'checkbox_group') {
            return <span className="text-[11px] leading-tight text-slate-900">{displayValue || 'Mocked checkbox selection'}</span>;
        }

        if (field.type === 'textarea') {
            return <p className="text-[11px] leading-snug text-slate-900">{displayValue}</p>;
        }

        if (isMeasurementSection(sectionName)) {
            return <span className="text-[10px] font-semibold leading-tight text-slate-900">{displayValue}</span>;
        }

        return <span className="text-[11px] leading-tight text-slate-900">{displayValue}</span>;
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

    const renderMeasurementSection = (section: TemplateViewModel['sections'][number]) => (
        <section key={section.section} className="break-inside-avoid">
            <h3 className="border border-slate-500 bg-slate-100 px-2 py-0.5 text-center text-xs font-bold uppercase tracking-wide">
                {section.section}
            </h3>
            <div className="grid grid-cols-4 gap-1.5 border border-t-0 border-slate-400 p-1.5 xl:grid-cols-6">
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

    const renderGeneralSection = (section: TemplateViewModel['sections'][number]) => {
        return (
            <section key={section.section} className="break-inside-avoid">
                <h3 className="border border-slate-500 bg-slate-100 px-2 py-0.5 text-center text-xs font-bold uppercase tracking-wide">
                    {section.section}
                </h3>
                <div className="grid grid-cols-4 gap-1.5 border border-t-0 border-slate-400 p-1.5">
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
                    className="page-a4 mx-auto overflow-hidden rounded-sm border border-slate-400 bg-white p-[9mm] text-slate-900 shadow-sm"
                >
                    <header className="mb-2">
                        <div className="px-2 py-1">
                            {headerSection ? (
                                <table className="w-full border-collapse">
                                    <tbody>{headerSection.fields.map((field) => renderFieldRow(field, headerSection.section, true))}</tbody>
                                </table>
                            ) : (
                                <p className="text-[11px] leading-tight text-slate-600">
                                    Header section is required and will repeat on each printed page.
                                </p>
                            )}
                        </div>
                    </header>

                    <div className="space-y-2">
                        {pageSections.map((section) =>
                            isMeasurementSection(section.section) ? (
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
