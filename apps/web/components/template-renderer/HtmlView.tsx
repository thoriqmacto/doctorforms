import type { TemplateViewModel } from '@/components/template-renderer/TemplateEngine';

type Props = {
    viewModel: TemplateViewModel;
};

const SECTION_HEADER_NAME = 'header';

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

    const renderFieldValue = (field: TemplateViewModel['sections'][number]['fields'][number]) => {
        if (field.type === 'image' || field.type === 'bullseye') {
            return (
                <span className="font-mono text-[10px] leading-tight text-slate-700">
                    {`<img src="${field.value}" alt="${field.label || 'image'}" />`}
                </span>
            );
        }

        if (field.type === 'checkbox_group') {
            return <span className="text-[11px] leading-tight text-slate-900">{field.value || 'Mocked checkbox selection'}</span>;
        }

        if (field.type === 'textarea') {
            return <p className="text-[11px] leading-snug text-slate-900">{field.value}</p>;
        }

        return <span className="text-[11px] leading-tight text-slate-900">{field.value}</span>;
    };

    const renderFieldRow = (field: TemplateViewModel['sections'][number]['fields'][number]) => (
        <tr key={field.id} className="align-top">
            {field.isStatic ? null : (
                <td className="w-[38%] border border-slate-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                    {field.label || 'Field'}
                </td>
            )}
            <td className="border border-slate-400 px-1.5 py-0.5">{renderFieldValue(field)}</td>
        </tr>
    );

    return (
        <div className="space-y-5">
            {paginatedSections.map((pageSections, pageIndex) => (
                <article
                    key={`page-${pageIndex}`}
                    className="page-a4 mx-auto overflow-hidden rounded-sm border border-slate-400 bg-white p-[9mm] text-slate-900 shadow-sm"
                >
                    <header className="mb-2 border border-slate-500">
                        <div className="border-b border-slate-500 px-2 py-1 text-center">
                            <h2 className="text-base font-bold uppercase leading-tight tracking-wide">{viewModel.title}</h2>
                            <p className="text-[10px] leading-tight text-slate-600">A4 compact report preview</p>
                        </div>

                        <div className="px-2 py-1">
                            {headerSection ? (
                                <table className="w-full border-collapse">
                                    <tbody>{headerSection.fields.map((field) => renderFieldRow(field))}</tbody>
                                </table>
                            ) : (
                                <p className="text-[11px] leading-tight text-slate-600">
                                    Header section is required and will repeat on each printed page.
                                </p>
                            )}
                        </div>
                    </header>

                    <div className="space-y-2">
                        {pageSections.map((section) => (
                            <section key={`${section.section}-${pageIndex}`} className="break-inside-avoid">
                                <h3 className="border border-slate-500 bg-slate-100 px-2 py-0.5 text-center text-xs font-bold uppercase tracking-wide">
                                    {section.section}
                                </h3>
                                <table className="w-full border-collapse">
                                    <tbody>{section.fields.map((field) => renderFieldRow(field))}</tbody>
                                </table>
                            </section>
                        ))}
                    </div>

                    <footer className="mt-2 border-t border-slate-300 pt-1 text-right text-[10px] text-slate-500">
                        Page {pageIndex + 1} / {paginatedSections.length}
                    </footer>
                </article>
            ))}
        </div>
    );
}
