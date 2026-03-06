'use client';

import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
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
    uploadTemplateFieldImage,
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
    option_values: string[];
    title_tag: string;
    image_url: string;
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

function toSlug(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function buildUniqueName(section: string, label: string) {
    const sectionSlug = toSlug(section || 'general') || 'general';
    const labelSlug = toSlug(label || 'field') || 'field';
    return `${sectionSlug}.${labelSlug}`;
}

function normalizeOptions(raw: unknown) {
    if (Array.isArray(raw)) {
        return {
            values: raw.map((v) => String(v)),
            default: '',
            required: false,
            title_tag: 'h2',
            image_url: '',
        };
    }

    if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        const values = Array.isArray(obj.values)
            ? obj.values.map((v) => String(v))
            : Array.isArray(obj.options)
                ? obj.options.map((v) => String(v))
                : [];

        return {
            values,
            default: obj.default ? String(obj.default) : '',
            required: !!obj.required,
            title_tag: obj.title_tag ? String(obj.title_tag) : 'h2',
            image_url: obj.image_url ? String(obj.image_url) : '',
        };
    }

    return {
        values: [],
        default: '',
        required: false,
        title_tag: 'h2',
        image_url: '',
    };
}

export default function EditTemplatePage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = params.id;

    const { data, isLoading: isTemplateLoading, mutate: mutateTemplate } = useSWR(
        id ? ['/templates', id, 'edit'] : null,
        () => getTemplate(id, { include: 'user,test,hospital,fields' })
    );
    const { data: testsData, mutate: mutateTests } = useSWR(['/tests'], () =>
        getTests().then((r: any) => r)
    );
    const { data: hospitalsData, mutate: mutateHospitals } = useSWR(['/hospitals'], () =>
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

    const watchedFields = useWatch({ control: form.control, name: 'fields' });
    const selectedTestId = useWatch({ control: form.control, name: 'test_id' });
    const selectedHospitalId = useWatch({ control: form.control, name: 'hospital_id' });
    const [successMessage, setSuccessMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isMutatingFields, setIsMutatingFields] = useState(false);
    const [uploadingImageByFieldIndex, setUploadingImageByFieldIndex] = useState<Record<number, boolean>>({});

    const groupedFields = useMemo(() => {
        const groups: {
            groupOrder: number;
            section: string;
            items: Array<{ index: number; renderKey: string }>;
        }[] = [];

        const currentFields = watchedFields ?? [];

        currentFields.forEach((field, index) => {
            const section = field?.section || 'General';
            const groupOrder = field?.field_group_order ?? 0;
            let group = groups.find((g) => g.groupOrder === groupOrder);
            if (!group) {
                group = { groupOrder, section, items: [] };
                groups.push(group);
            }
            group.items.push({
                index,
                renderKey: fields[index]?.id ?? field?.field_id ?? `${groupOrder}-${index}`,
            });
        });

        return groups.sort((a, b) => a.groupOrder - b.groupOrder);
    }, [fields, watchedFields]);

    function scrollToField(path: string) {
        const byName = document.querySelector(`[name="${path}"]`);
        const byDataAttr = document.querySelector(`[data-field-path="${path}"]`);
        const target = byName ?? byDataAttr;

        if (target instanceof HTMLElement) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.focus();
        }
    }

    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateSectionName(groupIndices: number[], sectionName: string) {
        groupIndices.forEach((fieldIndex) => {
            form.setValue(`fields.${fieldIndex}.section`, sectionName, {
                shouldDirty: true,
                shouldTouch: true,
            });
        });
    }

    async function removeSection(groupIndices: number[]) {
        const sorted = [...groupIndices].sort((a, b) => b - a);
        const persistedIds = sorted
            .map((fieldIndex) => form.getValues(`fields.${fieldIndex}.field_id`))
            .filter((v): v is string => Boolean(v));

        try {
            setIsMutatingFields(true);
            setSuccessMessage('');
            if (persistedIds.length > 0) {
                await Promise.all(persistedIds.map((fid) => deleteTemplateField(fid)));
            }
            sorted.forEach((fieldIndex) => remove(fieldIndex));
            setSuccessMessage('Section has been successfully removed.');
            await mutateTemplate();
            scrollToTop();
        } catch (e) {
            console.error(e);
            alert('Failed to remove section');
        } finally {
            setIsMutatingFields(false);
        }
    }

    async function removeField(fieldIndex: number) {
        const persistedId = form.getValues(`fields.${fieldIndex}.field_id`);

        try {
            setIsMutatingFields(true);
            setSuccessMessage('');
            if (persistedId) {
                await deleteTemplateField(persistedId);
            }
            remove(fieldIndex);
            setSuccessMessage('Field has been successfully removed.');
            await mutateTemplate();
            scrollToTop();
        } catch (e) {
            console.error(e);
            alert('Failed to remove field');
        } finally {
            setIsMutatingFields(false);
        }
    }

    const hydrateForm = useCallback((templateResponse: any) => {
        if (!templateResponse?.data) return;
        const a = templateResponse.data.attributes;
        const rels = templateResponse.data.relationships;
        const grouped = templateResponse?.data?.meta?.grouped_sections ?? [];
        const existing = grouped
            .flatMap((g: any) =>
                (g.items ?? []).map((f: any) => {
                    const options = normalizeOptions(f.attributes?.options);
                    return {
                        field_id: String(f.id),
                        section: f.attributes?.section ?? g.section ?? 'General',
                        label: f.attributes?.label ?? '',
                        type: f.attributes?.type ?? 'text',
                        default_value: options.default,
                        required: options.required,
                        order: f.attributes?.order ?? 0,
                        field_group_order: f.attributes?.field_group_order ?? 0,
                        option_values: options.values,
                        title_tag: options.title_tag,
                        image_url: options.image_url || options.default,
                    };
                })
            )
            .sort((a: any, b: any) =>
                a.field_group_order === b.field_group_order
                    ? a.order - b.order
                    : a.field_group_order - b.field_group_order
            );

        form.reset({
            name: a.name,
            description: a.description ?? '',
            user_id: rels?.user?.data?.id ? String(rels.user.data.id) : '',
            test_id: rels?.test?.data?.id ? String(rels.test.data.id) : '',
            hospital_id: rels?.hospital?.data?.id ? String(rels.hospital.data.id) : '',
            fields: existing,
        });
    }, [form]);

    useEffect(() => {
        hydrateForm(data);
    }, [data, hydrateForm]);

    async function onSubmit(values: EditTemplateFormValues) {
        try {
            setIsSaving(true);
            setSuccessMessage('');
            scrollToTop();

            await updateTemplate(id, {
                name: values.name,
                description: values.description,
                user_id: Number(values.user_id),
                test_id: Number(values.test_id),
                hospital_id: Number(values.hospital_id),
            });

            if (values.fields?.length) {
                await Promise.all(
                    values.fields.map((f, idx) => {
                        const baseOptions: Record<string, any> = {
                            required: !!f.required,
                        };

                        if (f.type === 'select') {
                            baseOptions.values = (f.option_values ?? []).filter((v) => v.trim() !== '');
                            if (f.default_value) {
                                baseOptions.default = f.default_value;
                            }
                        } else if (f.type === 'title') {
                            baseOptions.title_tag = f.title_tag || 'h2';
                            if (f.default_value) {
                                baseOptions.default = f.default_value;
                            }
                        } else if (f.type === 'image') {
                            const imageUrl = f.default_value || f.image_url;
                            if (imageUrl) {
                                baseOptions.default = imageUrl;
                                baseOptions.image_url = imageUrl;
                            }
                        } else if (f.default_value) {
                            baseOptions.default = f.default_value;
                        }

                        const fieldPayload = {
                            template_id: Number(id),
                            section: f.section || 'General',
                            label: f.label,
                            type: f.type,
                            order: idx + 1,
                            field_group_order: f.field_group_order ?? 0,
                            options: baseOptions,
                        };

                        if (f.field_id) {
                            return updateTemplateField(f.field_id, fieldPayload);
                        }

                        return createTemplateField(fieldPayload);
                    })
                );
            }

            setSuccessMessage('Template has been successfully updated.');
            await mutateTemplate();
            scrollToTop();
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
            scrollToTop();
        } finally {
            setIsSaving(false);
        }
    }

    function onInvalid() {
        const errorName = findFirstErrorPath(form.formState.errors);
        if (!errorName) return;

        scrollToField(errorName);
    }

    async function onDelete() {
        try {
            setIsDeleting(true);
            await deleteTemplate(id);
            router.push('/templates');
        } catch (e) {
            console.error(e);
            alert('Failed to delete');
        } finally {
            setIsDeleting(false);
        }
    }

    async function onRefresh() {
        try {
            setIsRefreshing(true);
            setSuccessMessage('');
            const refreshedTemplate = await mutateTemplate();
            await Promise.all([mutateTests(), mutateHospitals()]);
            hydrateForm(refreshedTemplate);
            setSuccessMessage('Template data has been refreshed.');
        } catch (e) {
            console.error(e);
            alert('Failed to refresh template data');
        } finally {
            setIsRefreshing(false);
        }
    }

    async function onPickImage(fieldIndex: number, fileList: FileList | null) {
        const file = fileList?.[0];
        if (!file) return;

        if (file.type !== 'image/png') {
            alert('Only PNG files are allowed.');
            return;
        }

        try {
            setUploadingImageByFieldIndex((prev) => ({ ...prev, [fieldIndex]: true }));
            const response = await uploadTemplateFieldImage(file);
            const imageUrl = response?.data?.attributes?.url ?? '';
            if (!imageUrl) throw new Error('Image upload response missing URL');

            form.setValue(`fields.${fieldIndex}.image_url`, imageUrl, { shouldDirty: true, shouldTouch: true });
            form.setValue(`fields.${fieldIndex}.default_value`, imageUrl, { shouldDirty: true, shouldTouch: true });
            setSuccessMessage('Image uploaded successfully.');
        } catch (e) {
            console.error(e);
            alert('Failed to upload image');
        } finally {
            setUploadingImageByFieldIndex((prev) => ({ ...prev, [fieldIndex]: false }));
        }
    }

    const templateName = data?.data?.attributes?.name ?? 'Template';
    const included = useMemo(() => data?.included ?? [], [data?.included]);

    const tests = useMemo(() => {
        const mappedTests = testsData?.data ?? [];
        if (!selectedTestId || mappedTests.some((t: any) => String(t.id) === selectedTestId)) return mappedTests;

        const includedTest = included.find(
            (item: any) => item.type === 'tests' && String(item.id) === selectedTestId
        );

        return [
            ...mappedTests,
            {
                id: selectedTestId,
                attributes: {
                    name: includedTest?.attributes?.name ?? `Test #${selectedTestId}`,
                },
            },
        ];
    }, [included, selectedTestId, testsData?.data]);

    const hospitals = useMemo(() => {
        const mappedHospitals = hospitalsData?.data ?? [];

        if (!selectedHospitalId || mappedHospitals.some((h: any) => String(h.id) === selectedHospitalId)) {
            return mappedHospitals;
        }

        const includedHospital = included.find(
            (item: any) => item.type === 'hospitals' && String(item.id) === selectedHospitalId
        );

        return [
            ...mappedHospitals,
            {
                id: selectedHospitalId,
                attributes: {
                    name: includedHospital?.attributes?.name ?? `Hospital #${selectedHospitalId}`,
                },
            },
        ];
    }, [hospitalsData?.data, included, selectedHospitalId]);

    const userId = data?.data?.relationships?.user?.data?.id;
    const { data: userData } = useSWR(userId ? ['/users', userId] : null, () => getUser(userId as string).then((r: any) => r));
    const userName = userData?.data?.attributes?.name ?? '';

    const isProcessing = isTemplateLoading || isSaving || isDeleting || isRefreshing || isMutatingFields;
    const showLoadingDataMessage = isTemplateLoading || isRefreshing;

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
                            <Button type="button" variant="secondary" onClick={onRefresh} disabled={isProcessing}>
                                {isRefreshing ? 'Refreshing...' : 'Refresh'}
                            </Button>
                            <Button type="button" onClick={form.handleSubmit(onSubmit, onInvalid)} disabled={isProcessing}>
                                {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                            <Button variant="destructive" onClick={onDelete} type="button" disabled={isProcessing}>
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
                            {successMessage ? (
                                <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{successMessage}</p>
                            ) : null}
                            {showLoadingDataMessage ? (
                                <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">Loading template data...</p>
                            ) : null}
                            {isSaving ? (
                                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">Saving changes...</p>
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
                                            <div className="flex items-end justify-between gap-3">
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
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    onClick={() => removeSection(group.items.map((item) => item.index))}
                                                    disabled={isProcessing}
                                                >
                                                    Remove Section
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {group.items.map(({ renderKey, index }) => {
                                                const fieldType = form.watch(`fields.${index}.type`);
                                                const selectOptions = form.watch(`fields.${index}.option_values`) ?? [];
                                                const currentDefaultValue = form.watch(`fields.${index}.default_value`);

                                                return (
                                                    <div key={renderKey} className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
                                                        <input type="hidden" {...form.register(`fields.${index}.field_id`)} />
                                                        <input type="hidden" {...form.register(`fields.${index}.section`)} />
                                                        <input type="hidden" {...form.register(`fields.${index}.image_url`)} />

                                                        <FormField
                                                            control={form.control}
                                                            name={`fields.${index}.label`}
                                                            rules={{ required: 'Field label is required' }}
                                                            render={({ field }) => (
                                                                <FormItem className="md:col-span-4 md:min-w-[180px]" data-field-path={`fields.${index}.label`}>
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <FormLabel>Field Label</FormLabel>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {buildUniqueName(group.section, field.value)}
                                                                        </span>
                                                                    </div>
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
                                                                            <SelectItem value="bullseye">Bullseye</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </FormItem>
                                                            )}
                                                        />

                                                        {fieldType === 'select' ? (
                                                            <FormField
                                                                control={form.control}
                                                                name={`fields.${index}.default_value`}
                                                                render={({ field }) => (
                                                                    <FormItem className="md:col-span-4 md:min-w-[180px]" data-field-path={`fields.${index}.default_value`}>
                                                                        <FormLabel>Default Value</FormLabel>
                                                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                                                            <FormControl>
                                                                                <SelectTrigger>
                                                                                    <SelectValue placeholder="Select default option" />
                                                                                </SelectTrigger>
                                                                            </FormControl>
                                                                            <SelectContent>
                                                                                {selectOptions.filter((option) => option.trim()).map((option, optionIndex) => (
                                                                                    <SelectItem key={`${option}-${optionIndex}`} value={option}>
                                                                                        {option}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        ) : (
                                                            <FormField
                                                                control={form.control}
                                                                name={`fields.${index}.default_value`}
                                                                render={({ field }) => (
                                                                    <FormItem className="md:col-span-4 md:min-w-[180px]" data-field-path={`fields.${index}.default_value`}>
                                                                        <FormLabel>Default Value</FormLabel>
                                                                        <FormControl>
                                                                            <Input {...field} type={fieldType === 'date' ? 'date' : 'text'} />
                                                                        </FormControl>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        )}

                                                        <div className="flex items-center justify-between gap-2 md:col-span-2 md:justify-end">
                                                            <FormField
                                                                control={form.control}
                                                                name={`fields.${index}.required`}
                                                                render={({ field }) => (
                                                                    <FormItem className="flex flex-row items-center space-x-2">
                                                                        <FormControl>
                                                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                                        </FormControl>
                                                                        <FormLabel>Required</FormLabel>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <Button type="button" variant="secondary" onClick={() => removeField(index)} disabled={isProcessing}>
                                                                Remove
                                                            </Button>
                                                        </div>

                                                        {fieldType === 'select' ? (
                                                            <div className="space-y-2 md:col-span-10">
                                                                <FormLabel>Select Options</FormLabel>
                                                                {selectOptions.map((_, optionIndex) => (
                                                                    <div className="flex items-center gap-2" key={`field-${index}-option-${optionIndex}`}>
                                                                        <Input
                                                                            value={selectOptions[optionIndex] ?? ''}
                                                                            onChange={(e) => {
                                                                                const updated = [...selectOptions];
                                                                                updated[optionIndex] = e.target.value;
                                                                                form.setValue(`fields.${index}.option_values`, updated, { shouldDirty: true, shouldTouch: true });
                                                                                if (currentDefaultValue && !updated.includes(currentDefaultValue)) {
                                                                                    form.setValue(`fields.${index}.default_value`, '', { shouldDirty: true, shouldTouch: true });
                                                                                }
                                                                            }}
                                                                            placeholder={`Option ${optionIndex + 1}`}
                                                                        />
                                                                        <Button
                                                                            type="button"
                                                                            variant="secondary"
                                                                            onClick={() => {
                                                                                const updated = selectOptions.filter((__, i) => i !== optionIndex);
                                                                                form.setValue(`fields.${index}.option_values`, updated, { shouldDirty: true, shouldTouch: true });
                                                                                if (currentDefaultValue && !updated.includes(currentDefaultValue)) {
                                                                                    form.setValue(`fields.${index}.default_value`, '', { shouldDirty: true, shouldTouch: true });
                                                                                }
                                                                            }}
                                                                        >
                                                                            Remove Option
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                                <Button
                                                                    type="button"
                                                                    variant="secondary"
                                                                    onClick={() =>
                                                                        form.setValue(`fields.${index}.option_values`, [...selectOptions, ''], { shouldDirty: true, shouldTouch: true })
                                                                    }
                                                                >
                                                                    Add Option
                                                                </Button>
                                                            </div>
                                                        ) : null}

                                                        {fieldType === 'title' ? (
                                                            <FormField
                                                                control={form.control}
                                                                name={`fields.${index}.title_tag`}
                                                                render={({ field }) => (
                                                                    <FormItem className="md:col-span-4" data-field-path={`fields.${index}.title_tag`}>
                                                                        <FormLabel>Title Tag</FormLabel>
                                                                        <Select onValueChange={field.onChange} value={field.value || 'h2'}>
                                                                            <FormControl>
                                                                                <SelectTrigger>
                                                                                    <SelectValue placeholder="Select title tag" />
                                                                                </SelectTrigger>
                                                                            </FormControl>
                                                                            <SelectContent>
                                                                                <SelectItem value="h1">h1</SelectItem>
                                                                                <SelectItem value="h2">h2</SelectItem>
                                                                                <SelectItem value="h3">h3</SelectItem>
                                                                                <SelectItem value="h4">h4</SelectItem>
                                                                                <SelectItem value="h6">h6</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        ) : null}

                                                        {fieldType === 'image' ? (
                                                            <div className="space-y-2 md:col-span-10">
                                                                <FormLabel>Upload PNG Image</FormLabel>
                                                                <Input type="file" accept="image/png" onChange={(e) => onPickImage(index, e.target.files)} />
                                                                {uploadingImageByFieldIndex[index] ? (
                                                                    <p className="text-sm text-muted-foreground">Uploading image...</p>
                                                                ) : null}
                                                                {currentDefaultValue ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img
                                                                        src={currentDefaultValue}
                                                                        alt="Field default preview"
                                                                        className="h-48 w-48 rounded-md border object-cover"
                                                                    />
                                                                ) : null}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
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
                                                        option_values: [],
                                                        title_tag: 'h2',
                                                        image_url: '',
                                                    })
                                                }
                                                disabled={isProcessing}
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
                                            section:
                                                window
                                                    .prompt('Section name', `New Section ${groupedFields.length + 1}`)
                                                    ?.trim() || `New Section ${groupedFields.length + 1}`,
                                            label: '',
                                            type: 'text',
                                            default_value: '',
                                            required: false,
                                            order: fields.length + 1,
                                            field_group_order:
                                                groupedFields.length > 0
                                                    ? Math.max(...groupedFields.map((group) => group.groupOrder)) + 1
                                                    : 1,
                                            option_values: [],
                                            title_tag: 'h2',
                                            image_url: '',
                                        })
                                    }
                                    disabled={isProcessing}
                                >
                                    Add Section
                                </Button>
                            </div>
                            <Button type="submit" disabled={isProcessing}>{isSaving ? 'Saving...' : 'Save'}</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
