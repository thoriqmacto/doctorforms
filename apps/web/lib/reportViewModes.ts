export type ReportViewMode = 'html' | 'pdf' | 'form';

export const SUPPORTED_REPORT_VIEW_MODES: ReportViewMode[] = ['html', 'pdf', 'form'];

export function normalizeReportViewMode(input: string | null): ReportViewMode {
    if (SUPPORTED_REPORT_VIEW_MODES.includes(input as ReportViewMode)) {
        return input as ReportViewMode;
    }
    return 'html';
}

export function buildReportModeHref(reportId: string, mode: ReportViewMode) {
    return `/reports/${reportId}?mode=${mode}`;
}
