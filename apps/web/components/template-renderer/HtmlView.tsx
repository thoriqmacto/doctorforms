import type { TemplateViewModel } from '@/components/template-renderer/TemplateEngine';

type Props = {
    viewModel: TemplateViewModel;
};

export default function HtmlView({ viewModel }: Props) {
    const renderFieldValue = (field: TemplateViewModel['sections'][number]['fields'][number]) => {
        if (field.type === 'checkbox_group') {
            return (
                <ul className="space-y-1 text-sm">
                    {field.options.length > 0 ? (
                        field.options.map((option) => (
                            <li key={`${field.id}-${option}`} className="flex items-center gap-2">
                                <span className="inline-flex h-4 w-4 rounded border border-slate-400" aria-hidden />
                                <span>{option}</span>
                            </li>
                        ))
                    ) : (
                        <li>{field.value}</li>
                    )}
                </ul>
            );
        }

        if (field.type === 'image' || field.type === 'bullseye') {
            return (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
                    {field.value}
                </div>
            );
        }

        if (field.type === 'textarea') {
            return (
                <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-900">
                    {field.value}
                </p>
            );
        }

        return <p className="text-sm leading-relaxed text-slate-900">{field.value}</p>;
    };

    return (
        <article className="page-a4 mx-auto rounded-xl border bg-white p-[20mm] text-slate-900 shadow-sm">
            <header className="mb-8 border-b border-slate-300 pb-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Medical Report Preview</p>
                <h2 className="mt-2 text-2xl font-semibold">{viewModel.title}</h2>
                <p className="mt-1 text-sm text-slate-500">A4 print-ready preview · source of truth for PDF</p>
            </header>

            <div className="space-y-6">
                {viewModel.sections.map((section) => (
                    <section key={section.section} className="break-inside-avoid space-y-3">
                        <h3 className="border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
                            {section.section}
                        </h3>
                        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                            {section.fields.map((field) => (
                                <div
                                    key={field.id}
                                    className={field.type === 'title' || field.type === 'textarea' ? 'space-y-1 md:col-span-2' : 'space-y-1'}
                                >
                                    <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                        <span>{field.label || 'Untitled field'}</span>
                                        {field.required ? <span className="text-[10px] text-red-500">*</span> : null}
                                    </dt>
                                    <dd className="min-h-5">{renderFieldValue(field)}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                ))}
            </div>
        </article>
    );
}
