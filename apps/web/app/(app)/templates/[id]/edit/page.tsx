'use client';

import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import {
    createTemplateField,
    deleteTemplate,
    deleteTemplateField,
    getHospitals,
    getUser,
    getTemplate,
    getTests,
    updateTemplate,
    updateTemplateField,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Breadcrumbs from '@/components/Breadcrumbs';

type TemplateFieldForm = {
    field_id?: string;
    section: string;
    label: string;
    type: string;
    default_value: string;
    required: boolean;
    order: number;
    field_group_order: number;
};

type EditTemplateFormValues = {
    name: string;
    description: string;
    user_id: string;
    test_id: string;
    hospital_id: string;
    fields: TemplateFieldForm[];
};


function findFirstErrorPath(errors: any, parent = ''): string | null {
    if (!errors || typeof errors !== 'object') return null;

    for (const key of Object.keys(errors)) {
        const value = errors[key];
        const path = parent ? `${parent}.${key}` : key;

        if (value?.message) return path;

        const nested = findFirstErrorPath(value, path);
        if (nested) return nested;
    }

    return null;
}

export default function EditTemplatePage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = params.id;

    const { data } = useSWR(
        id ? ['/templates', id, 'edit'] : null,
        () => getTemplate(id, { include: 'user,test,hospital,fields' })
    );
    const { data: testsData } = useSWR(['/tests'], () =>
        getTests().then((r: any) => r)
    );
    const { data: hospitalsData } = useSWR(['/hospitals'], () =>
        getHospitals().then((r: any) => r)
    );

    const form = useForm<EditTemplateFormValues>({
        defaultValues: {
            name: '',
            description: '',
            user_id: '',
            test_id: '',
            hospital_id: '',
            fields: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'fields',
    });
    const [successMessage, setSuccessMessage] = useState('');

    const groupedFields = useMemo(() => {
        const groups: {
            groupOrder: number;
            section: string;
            items: Array<{ index: number; field: TemplateFieldForm & { id: string } }>;
        }[] = [];

        fields.forEach((field, index) => {
            const section = (field as TemplateFieldForm).section || 'General';
            const groupOrder = (field as TemplateFieldForm).field_group_order ?? 0;
            let group = groups.find((g) => g.groupOrder === groupOrder);
            if (!group) {
                group = { groupOrder, section, items: [] };
                groups.push(group);
            }
            group.items.push({ index, field: field as TemplateFieldForm & { id: string } });
        });

        return groups.sort((a, b) => a.groupOrder - b.groupOrder);
    }, [fields]);

    function scrollToField(path: string) {
        const byName = document.querySelector(`[name="${path}"]`);
        const byDataAttr = document.querySelector(`[data-field-path="${path}"]`);
        const target = byName ?? byDataAttr;

        if (target instanceof HTMLElement) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.focus();
        }
    }

    function updateSectionName(groupIndices: number[], sectionName: string) {
        groupIndices.forEach((fieldIndex) => {
            form.setValue(`fields.${fieldIndex}.section`, sectionName, {
                shouldDirty: true,
                shouldTouch: true,
            });
        });
    }

    useEffect(() => {
        if (data?.data) {
            const a = data.data.attributes;
            const rels = data.data.relationships;
            const grouped = data?.data?.meta?.grouped_sections ?? [];
            const existing = grouped
                .flatMap((g: any) =>
                    (g.items ?? []).map((f: any) => ({
                        field_id: f.id,
                        section: f.attributes?.section ?? g.section ?? 'General',
                        label: f.attributes?.label ?? '',
                        type: f.attributes?.type ?? 'text',
                        default_value: f.attributes?.options?.default ?? '',
                        required: !!f.attributes?.options?.required,
                        order: f.attributes?.order ?? 0,
                        field_group_order: f.attributes?.field_group_order ?? 0,
                    }))
                )
                .sort((a: any, b: any) =>
                    a.field_group_order === b.field_group_order ? a.order - b.order : a.field_group_order - b.field_group_order
                );

            form.reset({
                name: a.name,
                description: a.description ?? '',
                user_id: rels?.user?.data?.id ? String(rels.user.data.id) : '',
                test_id: rels?.test?.data?.id ? String(rels.test.data.id) : '',
                hospital_id: rels?.hospital?.data?.id ? String(rels.hospital.data.id) : '',
                fields: existing,
            });
        }
    }, [data, form]);

    async function onSubmit(values: EditTemplateFormValues) {
        try {
            setSuccessMessage('');
            const payload = {
                name: values.name,
                description: values.description,
                user_id: Number(values.user_id),
                test_id: Number(values.test_id),
                hospital_id: Number(values.hospital_id),
            };

            await updateTemplate(id, payload);

            const originalFieldIds = new Set<string>(
                (data?.data?.meta?.grouped_sections ?? [])
                    .flatMap((g: any) => (g.items ?? []).map((f: any) => String(f.id)))
            );
            const submittedIds = new Set<string>(
                (values.fields ?? [])
                    .map((f) => f.field_id)
                    .filter((v): v is string => Boolean(v))
            );

            const removedIds = Array.from(originalFieldIds).filter((fid) => !submittedIds.has(fid));
            if (removedIds.length > 0) {
                await Promise.all(removedIds.map((fid) => deleteTemplateField(fid)));
            }

            if (values.fields?.length) {
                await Promise.all(
                    values.fields.map((f, idx) => {
                        const options = {
                            ...(f.default_value ? { default: f.default_value } : {}),
                            required: !!f.required,
                        };

                        const fieldPayload = {
                            template_id: Number(id),
                            section: f.section || 'General',
                            label: f.label,
                            type: f.type,
                            order: idx + 1,
                            field_group_order: f.field_group_order ?? 0,
                            options,
                        };

                        if (f.field_id) {
                            return updateTemplateField(f.field_id, fieldPayload);
                        }

                        return createTemplateField(fieldPayload);
                    })
                );
            }

            setSuccessMessage('Template has been successfully updated.');
        } catch (e: any) {
            const errors = e?.response ? await e.response.json().catch(() => null) : null;
            const firstErrorPath = Object.keys(errors?.errors ?? {})[0];
            if (firstErrorPath) {
                form.setError(firstErrorPath as any, {
                    type: 'server',
                    message: errors.errors[firstErrorPath]?.[0] ?? 'Invalid value',
                });
                scrollToField(firstErrorPath);
            }

            console.error(e);
            alert('Failed to save');
        }
    }

    function onInvalid() {
        const errorName = findFirstErrorPath(form.formState.errors);
        if (!errorName) return;

        scrollToField(errorName);
    }

    async function onDelete() {
        try {
            await deleteTemplate(id);
            router.push('/templates');
        } catch (e) {
            console.error(e);
            alert('Failed to delete');
        }
    }

    const templateName = data?.data?.attributes?.name ?? 'Template';
    const tests = testsData?.data ?? [];
    const hospitals = hospitalsData?.data ?? [];
    const userId = data?.data?.relationships?.user?.data?.id;
    const { data: userData } = useSWR(
        userId ? ['/users', userId] : null,
        () => getUser(userId as string).then((r: any) => r)
    );
    const userName = userData?.data?.attributes?.name ?? '';

    return (
        <div className="space-y-4">
            <Breadcrumbs
                items={[
                    { label: 'Dashboard', href: '/' },
                    { label: 'Templates', href: '/templates' },
                    { label: `Edit ${templateName}` },
                ]}
            />
            <Card className="mx-auto w-full max-w-5xl">
                <CardHeader className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex flex-row items-center justify-between gap-3">
                        <CardTitle>Edit {templateName}</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                onClick={form.handleSubmit(onSubmit, onInvalid)}
                            >
                                Save
                            </Button>
                            <Button variant="destructive" onClick={onDelete} type="button">
                                Delete
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
                            {successMessage ? (
                                <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                                    {successMessage}
                                </p>
                            ) : null}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Template Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        rules={{ required: 'Name is required' }}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Name</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Description</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="user_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>User</FormLabel>
                                                <FormControl>
                                                    <Input value={userName} disabled />
                                                </FormControl>
                                                <FormMessage />
                                                <input type="hidden" {...field} />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <FormField
                                            control={form.control}
                                            name="test_id"
                                            rules={{ required: 'Test is required' }}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Test</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select test" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {tests.map((t: any) => (
                                                                <SelectItem key={t.id} value={String(t.id)}>
                                                                    {t.attributes?.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="hospital_id"
                                            rules={{ required: 'Hospital is required' }}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Hospital</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select hospital" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {hospitals.map((h: any) => (
                                                                <SelectItem key={h.id} value={String(h.id)}>
                                                                    {h.attributes?.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-4">
                                {groupedFields.map((group) => (
                                    <Card key={group.groupOrder}>
                                        <CardHeader>
                                            <div className="max-w-sm space-y-2">
                                                <FormLabel>Section Name</FormLabel>
                                                <Input
                                                    value={group.section}
                                                    onChange={(e) =>
                                                        updateSectionName(
                                                            group.items.map((item) => item.index),
                                                            e.target.value
                                                        )
                                                    }
                                                    data-field-path={`fields.${group.items[0]?.index}.section`}
                                                />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {group.items.map(({ field: fieldItem, index }) => (
                                                <div
                                                    key={fieldItem.id}
                                                    className="grid grid-cols-1 items-end gap-3 md:grid-cols-12"
                                                >
                                                    <input
                                                        type="hidden"
                                                        {...form.register(`fields.${index}.field_id`)}
                                                    />
                                                    <input
                                                        type="hidden"
                                                        {...form.register(`fields.${index}.section`)}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`fields.${index}.label`}
                                                        rules={{ required: 'Field label is required' }}
                                                        render={({ field }) => (
                                                            <FormItem className="md:col-span-4 md:min-w-[180px]" data-field-path={`fields.${index}.label`}>
                                                                <FormLabel>Field Label</FormLabel>
                                                                <FormControl>
                                                                    <Input {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`fields.${index}.type`}
                                                        render={({ field }) => (
                                                            <FormItem className="md:col-span-2" data-field-path={`fields.${index}.type`}>
                                                                <FormLabel>Type</FormLabel>
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select type" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="text">Text</SelectItem>
                                                                        <SelectItem value="number">Number</SelectItem>
                                                                        <SelectItem value="select">Select</SelectItem>
                                                                        <SelectItem value="textarea">Textarea</SelectItem>
                                                                        <SelectItem value="title">Title</SelectItem>
                                                                        <SelectItem value="image">Image</SelectItem>
                                                                        <SelectItem value="date">Date</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`fields.${index}.default_value`}
                                                        render={({ field }) => (
                                                            <FormItem className="md:col-span-4 md:min-w-[180px]" data-field-path={`fields.${index}.default_value`}>
                                                                <FormLabel>Default Value</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        {...field}
                                                                        type={form.watch(`fields.${index}.type`) === 'date' ? 'date' : 'text'}
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <div className="flex items-center justify-between gap-2 md:col-span-2 md:justify-end">
                                                        <FormField
                                                            control={form.control}
                                                            name={`fields.${index}.required`}
                                                            render={({ field }) => (
                                                                <FormItem className="flex flex-row items-center space-x-2">
                                                                    <FormControl>
                                                                        <Checkbox
                                                                            checked={field.value}
                                                                            onCheckedChange={field.onChange}
                                                                        />
                                                                    </FormControl>
                                                                    <FormLabel>Required</FormLabel>
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={() => remove(index)}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() =>
                                                    append({
                                                        section: group.section || 'General',
                                                        label: '',
                                                        type: 'text',
                                                        default_value: '',
                                                        required: false,
                                                        order: fields.length + 1,
                                                        field_group_order: group.groupOrder,
                                                    })
                                                }
                                            >
                                                Add Field
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        append({
                                            section: `New Section ${groupedFields.length + 1}`,
                                            label: '',
                                            type: 'text',
                                            default_value: '',
                                            required: false,
                                            order: fields.length + 1,
                                            field_group_order:
                                                groupedFields.length > 0
                                                    ? Math.max(...groupedFields.map((group) => group.groupOrder)) + 1
                                                    : 1,
                                        })
                                    }
                                >
                                    Add Section
                                </Button>
                            </div>
                            <Button type="submit">Save</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
