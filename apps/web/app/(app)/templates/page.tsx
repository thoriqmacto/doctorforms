'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
    createTemplate,
    createTemplateField,
    deleteTemplate,
    getTemplate,
    getTemplates,
    getTests,
} from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { TemplateResource, TemplatesIndexResponse } from '@/types/api';
import Breadcrumbs from '@/components/Breadcrumbs';


async function getApiErrorMessage(error: unknown, fallbackMessage: string): Promise<string> {
    if (!(error instanceof Error) || !('response' in error)) {
        return fallbackMessage;
    }

    const response = (error as Error & { response?: Response }).response;

    if (!response) {
        return fallbackMessage;
    }

    try {
        const payload = await response.clone().json();

        if (typeof payload?.message === 'string' && payload.message.trim() !== '') {
            return payload.message;
        }

        if (typeof payload?.errors?.[0]?.detail === 'string' && payload.errors[0].detail.trim() !== '') {
            return payload.errors[0].detail;
        }
    } catch {
        // fallback to default message
    }

    return fallbackMessage;
}

export default function TemplatesPage() {
    const { data, isLoading, error, mutate } = useSWR<TemplatesIndexResponse>(
        ['/templates'],
        () => getTemplates({ include: 'test' }) as Promise<TemplatesIndexResponse>
    );

    const { data: testData } = useSWR(['/tests'], () => getTests().then((r: any) => r));

    const rows = data?.data ?? [];
    const tests = testData?.data ?? [];

    const testsMap = new Map<string, any>(tests.map((t: any) => [String(t.id), t]));

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
    const [isMassDeleting, setIsMassDeleting] = useState(false);

    const isAllSelected = rows.length > 0 && selectedIds.length === rows.length;
    const hasPartialSelection = selectedIds.length > 0 && selectedIds.length < rows.length;

    const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    function toggleAll(checked: boolean) {
        if (checked) {
            setSelectedIds(rows.map((row) => String(row.id)));
            return;
        }

        setSelectedIds([]);
    }

    function toggleOne(id: string, checked: boolean) {
        if (checked) {
            setSelectedIds((current) => (current.includes(id) ? current : [...current, id]));
            return;
        }

        setSelectedIds((current) => current.filter((item) => item !== id));
    }

    async function handleDelete(templateId: string) {
        const shouldDelete = window.confirm('Delete this template?');
        if (!shouldDelete) return;

        try {
            setIsDeleting(templateId);
            await deleteTemplate(templateId);
            setSelectedIds((current) => current.filter((id) => id !== templateId));
            await mutate();
        } catch (e) {
            console.error(e);
            alert(await getApiErrorMessage(e, 'Failed to delete template'));
        } finally {
            setIsDeleting(null);
        }
    }

    async function handleMassDelete() {
        if (selectedIds.length === 0) return;

        const shouldDelete = window.confirm(`Delete ${selectedIds.length} selected template(s)?`);
        if (!shouldDelete) return;

        try {
            setIsMassDeleting(true);
            await Promise.all(selectedIds.map((id) => deleteTemplate(id)));
            setSelectedIds([]);
            await mutate();
        } catch (e) {
            console.error(e);
            alert(await getApiErrorMessage(e, 'Failed to delete selected templates'));
        } finally {
            setIsMassDeleting(false);
        }
    }

    async function handleDuplicate(template: TemplateResource) {
        try {
            setIsDuplicating(template.id);
            const source = await getTemplate(template.id, { include: 'fields' });
            const sourceTemplate = source?.data;

            if (!sourceTemplate) {
                alert('Template not found');
                return;
            }

            const rels = sourceTemplate.relationships;
            const newTemplate = await createTemplate({
                name: `${sourceTemplate.attributes?.name ?? 'Template'} (Copy)`,
                description: sourceTemplate.attributes?.description ?? '',
                user_id: Number(rels?.user?.data?.id ?? 1),
                test_id: Number(rels?.test?.data?.id ?? 0),
                hospital_id: Number(rels?.hospital?.data?.id ?? 0),
            });

            const newTemplateId = Number(newTemplate?.data?.id ?? newTemplate?.id);
            const sourceSections = sourceTemplate.meta?.grouped_sections ?? [];
            const sourceFields = sourceSections.flatMap((section: any) => section.items ?? []);

            if (newTemplateId && sourceFields.length > 0) {
                await Promise.all(
                    sourceFields.map((field: any, index: number) =>
                        createTemplateField({
                            template_id: newTemplateId,
                            section: field?.attributes?.section ?? 'General',
                            label: field?.attributes?.label ?? '',
                            type: field?.attributes?.type ?? 'text',
                            order: field?.attributes?.order ?? index + 1,
                            field_group_order: field?.attributes?.field_group_order ?? 0,
                            options: field?.attributes?.options ?? null,
                            required: !!field?.attributes?.options?.required,
                        })
                    )
                );
            }

            await mutate();
        } catch (e) {
            console.error(e);
            alert('Failed to duplicate template');
        } finally {
            setIsDuplicating(null);
        }
    }

    return (
        <div className="space-y-4">
            <Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Templates' }]} />
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Templates</h1>
                <Link href="/templates/new">
                    <Button>Add Template</Button>
                </Link>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>All Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => selectedIds.forEach((id) => window.open(`/templates/${id}/print`, '_blank'))}
                            disabled={selectedIds.length === 0}
                        >
                            Print Selected
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleMassDelete}
                            disabled={selectedIds.length === 0 || isMassDeleting}
                        >
                            Delete Selected
                        </Button>
                    </div>
                    {isLoading ? (
                        'Loading…'
                    ) : error ? (
                        'Failed to load'
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">
                                        <Checkbox
                                            checked={isAllSelected || (hasPartialSelection ? 'indeterminate' : false)}
                                            onCheckedChange={(checked) => toggleAll(checked === true)}
                                            aria-label="Select all templates"
                                        />
                                    </TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Test Method</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((t: TemplateResource) => {
                                    const testId = t.relationships?.test?.data?.id;
                                    const test = testId ? testsMap.get(String(testId)) : undefined;
                                    const testName = test?.attributes?.code ?? '-';
                                    const rowId = String(t.id);

                                    return (
                                        <TableRow key={t.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIdSet.has(rowId)}
                                                    onCheckedChange={(checked) => toggleOne(rowId, checked === true)}
                                                    aria-label={`Select template ${t.attributes.name}`}
                                                />
                                            </TableCell>
                                            <TableCell>{t.attributes.name}</TableCell>
                                            <TableCell>{testName}</TableCell>
                                            <TableCell>{t.attributes.description}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link href={`/templates/${t.id}/view`}>
                                                        <Button variant="ghost" size="sm">
                                                            View
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/templates/${t.id}/print`}>
                                                        <Button variant="ghost" size="sm">
                                                            Print
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/templates/${t.id}/edit`}>
                                                        <Button variant="secondary" size="sm">
                                                            Edit
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDuplicate(t)}
                                                        disabled={isDuplicating === rowId}
                                                    >
                                                        Duplicate
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDelete(rowId)}
                                                        disabled={isDeleting === rowId}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
