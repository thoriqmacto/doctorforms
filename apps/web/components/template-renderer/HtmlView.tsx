import type { TemplateViewModel } from '@/components/template-renderer/TemplateEngine';

type Props = {
    viewModel: TemplateViewModel;
};

export default function HtmlView({ viewModel }: Props) {
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
                        <dl className="grid grid-cols-2 gap-x-8 gap-y-3">
                            {section.fields.map((field) => (
                                <div key={field.id} className="space-y-1">
                                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{field.label}</dt>
                                    <dd className="min-h-5 text-sm leading-relaxed text-slate-900">{field.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                ))}
            </div>
        </article>
    );
}
