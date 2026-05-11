'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { getHospital, getPatient, getReport, getTemplate, getUser, getUsers, updateReport } from '@/lib/api';
import TemplateFormRenderer from '@/components/form/TemplateFormRenderer';
import SignatorySelector from '@/components/form/SignatorySelector';
import type { RenderContexts } from '@/lib/template-renderer/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/components/auth-provider';
import Breadcrumbs from '@/components/Breadcrumbs';
import { buildReportModeHref } from '@/lib/reportViewModes';

type ReportMetadata = {
    title: string;
    operator: string;
    supervisor: string;
    device: string;
};

const EMPTY_METADATA: ReportMetadata = {
    title: '',
    operator: '',
    supervisor: '',
    device: '',
};

export default function EditReportPage() {
    const { id } = useParams<{ id: string }>();
    const { user: authUser } = useAuth();
    const isAdmin = authUser?.role === 'admin';

    // 1) Calm SWR down while editing
    const swrOpts = {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        dedupingInterval: 120_000,
    };

    const { data: reportRes, isLoading, mutate: mutateReport } = useSWR(
        id ? ['/reports', id] : null,
        () => getReport(id, { include: 'fields,template,measurements,patient,user,hospital,signatory' }),
        swrOpts
    );

    const report = reportRes?.data;
    const title = report?.attributes?.title ?? `Report #${id}`;
    const templateId = report?.relationships?.template?.data?.id;
    const patientId = report?.relationships?.patient?.data?.id;
    const hospitalId = report?.relationships?.hospital?.data?.id;
    const userId = report?.relationships?.user?.data?.id;
    const initialSignatoryId = report?.relationships?.signatory?.data?.id
        ? Number(report.relationships.signatory.data.id)
        : null;
    const [signatoryId, setSignatoryId] = useState<number | null>(null);
    const signatoryHydrated = useRef(false);

    const [metadata, setMetadata] = useState<ReportMetadata>(EMPTY_METADATA);
    const metadataHydrated = useRef(false);
    const [assignedUserId, setAssignedUserId] = useState<string>('unassigned');
    const ownerHydrated = useRef(false);

    useEffect(() => {
        if (!signatoryHydrated.current && reportRes) {
            setSignatoryId(initialSignatoryId);
            signatoryHydrated.current = true;
        }
    }, [reportRes, initialSignatoryId]);

    useEffect(() => {
        if (!metadataHydrated.current && report) {
            const attrs = report?.attributes ?? {};
            setMetadata({
                title: typeof attrs.title === 'string' ? attrs.title : '',
                operator: typeof attrs.operator === 'string' ? attrs.operator : '',
                supervisor: typeof attrs.supervisor === 'string' ? attrs.supervisor : '',
                device: typeof attrs.device === 'string' ? attrs.device : '',
            });
            metadataHydrated.current = true;
        }
    }, [report]);


    useEffect(() => {
        if (!ownerHydrated.current && reportRes) {
            const ownerId = report?.relationships?.user?.data?.id;
            setAssignedUserId(ownerId ? String(ownerId) : 'unassigned');
            ownerHydrated.current = true;
        }
    }, [reportRes, report]);
    const setMetadataField = (key: keyof ReportMetadata) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setMetadata((prev) => ({ ...prev, [key]: value }));
        };

    const { data: patientRes } = useSWR(
        patientId ? ['/patients', patientId] : null,
        () => getPatient(patientId as string),
        swrOpts
    );
    const { data: hospitalRes } = useSWR(
        hospitalId ? ['/hospitals', hospitalId] : null,
        () => getHospital(hospitalId as string),
        swrOpts
    );
    const { data: userRes } = useSWR(
        userId ? ['/users', userId] : null,
        () => getUser(userId as string),
        swrOpts
    );


    const { data: usersRes } = useSWR(
        isAdmin ? ['/users', 'owner-select'] : null,
        () => getUsers(),
        swrOpts
    );

    const ownerOptions = usersRes?.data ?? [];
    const contexts: RenderContexts = {
        hospital: hospitalRes?.data?.attributes,
        patient: patientRes?.data?.attributes,
        user: userRes?.data?.attributes,
        report: {
            title: metadata.title || report?.attributes?.title,
            operator: metadata.operator || report?.attributes?.operator,
            supervisor: metadata.supervisor || report?.attributes?.supervisor,
            device: metadata.device || report?.attributes?.device,
        },
    };

    const { data: templateRes, mutate: mutateTemplate } = useSWR(
        templateId ? ['/templates', templateId] : null,
        () => getTemplate(templateId as string, { include: 'fields' }),
        swrOpts
    );

    // 2) Freeze grouped sections once per templateId
    const [groupedSections, setGroupedSections] = useState<any[] | null>(null);
    const groupedHydrated = useRef(false);

    useEffect(() => {
        if (!groupedHydrated.current && templateRes?.data?.meta?.grouped_sections) {
            setGroupedSections(templateRes.data.meta.grouped_sections);
            groupedHydrated.current = true;
        }
    }, [templateRes]);

    const editableSections = (groupedSections ?? []).filter(
        (section: any) => section?.section?.trim().toLowerCase() !== 'header'
    );

    // 3) Build initial values ONCE when both report and grouped are ready
    const [initialValues, setInitialValues] = useState<Record<string, any> | null>(null);
    const initHydrated = useRef(false);

    useEffect(() => {
        if (!initHydrated.current && report && groupedSections) {
            const reportFields = report?.relationships?.fields?.data ?? [];
            const reportMeasurements = report?.relationships?.measurements?.data ?? [];
            const byTemplateFieldId = new Map<string, any>(
                reportFields.map((f: any) => [String(f.template_field_id), f.value])
            );
            const measurementByName = new Map<string, any>(
                reportMeasurements.map((m: any) => [String(m.attributes?.name ?? ''), m.attributes?.value])
            );

            const vals: Record<string, any> = {};
            for (const sec of editableSections) {
                for (const f of sec.items ?? []) {
                    const key = `f_${f.id}`;
                    if (f.attributes?.type === 'measurement') {
                        const options = (f.attributes?.options ?? {}) as any;
                        const measurementName = options.measurement_name ?? f.attributes?.label;
                        const measurementValue = measurementByName.get(String(measurementName));
                        if (measurementValue !== undefined) {
                            vals[key] = measurementValue;
                            continue;
                        }
                    }

                    const val = byTemplateFieldId.get(String(f.id));
                    if (val !== undefined) {
                        vals[key] = val;
                    }
                }
            }
            setInitialValues(vals);
            initHydrated.current = true;
        }
    }, [editableSections, groupedSections, report]);

    async function onRefresh() {
        initHydrated.current = false;
        groupedHydrated.current = false;
        signatoryHydrated.current = false;
        metadataHydrated.current = false;
        setInitialValues(null);
        setGroupedSections(null);
        await Promise.all([
            mutateReport(undefined, { revalidate: true }),
            mutateTemplate(undefined, { revalidate: true }),
        ]);
        toast.success('Form refreshed with latest server data.');
    }

    async function onSubmit(values: Record<string, any>) {
        try {
            const fields: Array<{ template_field_id: number; value: string }> = [];
            const measurements: Array<{
                name: string;
                value: string;
                unit: string;
                category: string;
            }> = [];

            editableSections.forEach((sec: any) => {
                (sec.items ?? []).forEach((field: any) => {
                    const rawValue = values[`f_${field.id}`];
                    const normalizedValue = Array.isArray(rawValue)
                        ? rawValue.join(', ')
                        : rawValue && typeof rawValue === 'object'
                          ? JSON.stringify(rawValue)
                          : rawValue;

                    if (normalizedValue === undefined || normalizedValue === null || String(normalizedValue).trim() === '') {
                        return;
                    }

                    const options = (field.attributes?.options ?? {}) as any;
                    if (field.attributes?.type === 'measurement') {
                        measurements.push({
                            name: options.measurement_name ?? field.attributes?.label ?? 'Measurement',
                            value: String(normalizedValue),
                            unit: options.measurement_unit ?? '',
                            category: options.measurement_category ?? '',
                        });
                        return;
                    }

                    fields.push({
                        template_field_id: Number(field.id),
                        value: String(normalizedValue),
                    });
                });
            });

            await updateReport(id, {
                title: metadata.title,
                operator: metadata.operator,
                supervisor: metadata.supervisor,
                device: metadata.device,
                fields,
                measurements,
                signatory_id: signatoryId,
                ...(isAdmin
                    ? { user_id: assignedUserId === 'unassigned' ? null : Number(assignedUserId) }
                    : {}),
            });
            // Surface success immediately, before the (potentially slow)
            // revalidate/rehydrate cycle so the toast doesn't get lost
            // behind a re-render or appear delayed.
            toast.success('Report saved successfully.');
            // Drop any autosave draft for this report before rehydrating so
            // TemplateFormRenderer's draft-restore effect doesn't overwrite
            // freshly persisted server values with a stale local draft.
            try {
                window.localStorage.removeItem(`report-edit-draft:${id}`);
            } catch {
                // ignore storage failures; the rehydrate path still wins
            }
            // Template structure is unchanged by a report save, so we keep
            // groupedSections/groupedHydrated. Resetting them here without
            // also calling mutateTemplate() leaves the form stuck on
            // "Loading…" and a subsequent save would post empty
            // fields/measurements arrays, which the backend treats as a
            // wipe.
            initHydrated.current = false;
            signatoryHydrated.current = false;
            metadataHydrated.current = false;
            ownerHydrated.current = false;
            setInitialValues(null);
            await mutateReport(undefined, { revalidate: true });
        } catch (e) {
            console.error(e);
            toast.error('Failed to save report.');
        }
    }

    return (
        <div className="space-y-4">
            <Breadcrumbs
                items={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Reports', href: '/reports' },
                    { label: `Edit ${title}` },
                ]}
            />
            <Card>
                <CardHeader>
                    <CardTitle>Report metadata</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1 md:col-span-2">
                            <Label htmlFor="report-title">Title</Label>
                            <Input
                                id="report-title"
                                value={metadata.title}
                                onChange={setMetadataField('title')}
                                placeholder="Report title"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="report-operator">Operator</Label>
                            <Input
                                id="report-operator"
                                value={metadata.operator}
                                onChange={setMetadataField('operator')}
                                placeholder="Operator name"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="report-supervisor">Supervisor</Label>
                            <Input
                                id="report-supervisor"
                                value={metadata.supervisor}
                                onChange={setMetadataField('supervisor')}
                                placeholder="Supervisor name"
                            />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <Label htmlFor="report-device">Device</Label>
                            <Input
                                id="report-device"
                                value={metadata.device}
                                onChange={setMetadataField('device')}
                                placeholder="e.g. GE Vivid E95"
                            />
                        </div>
                        {isAdmin && (
                            <div className="space-y-1 md:col-span-2">
                                <Label htmlFor="report-owner">Assigned user</Label>
                                <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                                    <SelectTrigger id="report-owner">
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {ownerOptions.map((owner: any) => (
                                            <SelectItem key={owner.id} value={String(owner.id)}>
                                                {owner.attributes?.name ?? `User #${owner.id}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                        Metadata is saved together with the rest of the report. Patient, template, hospital, and test cannot be changed here.
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Edit {title}</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading || !groupedSections || !initialValues ? (
                        'Loading…'
                    ) : (
                        <div className="mx-auto w-full max-w-6xl space-y-4">
                            <div className="rounded-xl border bg-white shadow-md">
                            <TemplateFormRenderer
                                groupedSections={editableSections}
                                initialValues={initialValues}
                                onSubmit={onSubmit}
                                enableSectionControls
                                showRefreshButton
                                onRefresh={onRefresh}
                                showDirtyState
                                warnOnLeaveWithUnsavedChanges
                                autosaveDraftKey={`report-edit-draft:${id}`}
                                showPrintButton={false}
                                enableBsaAutoCalc={false}
                                contexts={contexts}
                                viewLinks={[
                                    { href: buildReportModeHref(id, 'html'), label: 'View HTML' },
                                    { href: buildReportModeHref(id, 'pdf'), label: 'View PDF' },
                                ]}
                            />
                            </div>
                            <SignatorySelector
                                hospitalId={hospitalId ? Number(hospitalId) : null}
                                value={signatoryId}
                                onChange={setSignatoryId}
                                patientUserId={patientRes?.data?.relationships?.user?.data?.id
                                    ? Number(patientRes.data.relationships.user.data.id)
                                    : null}
                                helperText="Update the doctor whose signature will be embedded in this report."
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
