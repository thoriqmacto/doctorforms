import type { TemplateViewModel } from '@/components/template-renderer/TemplateEngine';

type ViewSection = TemplateViewModel['sections'][number];

function isFindingsSection(sectionName: string) {
    return sectionName.trim().toLowerCase().startsWith('findings_');
}

function findingsSuffix(sectionName: string) {
    return sectionName.replace(/^findings_/i, '').trim();
}

export function formatFindingsGroupText(raw: string) {
    const value = raw.trim();
    const match = value.match(/^0*(\d+)_+(.+)$/);
    if (match) {
        const [, numericPart, titlePart] = match;
        return `${Number(numericPart)}. ${titlePart.replace(/_/g, ' ').trim()}`;
    }

    return value.replace(/_/g, ' ').trim();
}

export function mergeFindingsSections(sections: ViewSection[]) {
    const findings = sections.filter((section) => isFindingsSection(section.section));
    if (findings.length === 0) {
        return sections;
    }

    const firstFindingsIndex = sections.findIndex((section) => isFindingsSection(section.section));
    const insertAt = sections.slice(0, firstFindingsIndex).filter((section) => !isFindingsSection(section.section)).length;

    const mergedFindingsSection: ViewSection = {
        section: 'Findings',
        fields: findings.flatMap((section) => {
            const resultField =
                section.fields.find((field) => field.type === 'textarea' && field.textareaMode === 'result') ??
                section.fields.find((field) => field.type === 'textarea') ??
                section.fields[0];

            if (!resultField) {
                return [];
            }

            return {
                ...resultField,
                id: `${resultField.id}-findings-row`,
                label: formatFindingsGroupText(findingsSuffix(section.section)) || resultField.label,
            };
        }),
    };

    const nonFindings = sections.filter((section) => !isFindingsSection(section.section));
    return [
        ...nonFindings.slice(0, insertAt),
        mergedFindingsSection,
        ...nonFindings.slice(insertAt),
    ];
}
