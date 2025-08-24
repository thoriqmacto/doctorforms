'use client';

import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import {
    createTemplateField,
    deleteTemplate,
    getHospitals,
    getUser,
    getTemplate,
    getTests,
    updateTemplate,
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

    const form = useForm({
        defaultValues: {
            name: '',
            description: '',
            user_id: '',
            test_id: '',
            hospital_id: '',
            fields: [] as any[],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'fields',
    });

    const groupedFields = useMemo(() => {
        const groups: { section: string; items: Array<{ index: number; field: any }> }[] = [];
        fields.forEach((field, index) => {
            const section = (field as any).section || 'General';
            let group = groups.find((g) => g.section === section);
            if (!group) {
                group = { section, items: [] };
                groups.push(group);
            }
            group.items.push({ index, field });
        });
        return groups;
    }, [fields]);

    useEffect(() => {
        if (data?.data) {
            const a = data.data.attributes;
            const rels = data.data.relationships;
            const included = data.included ?? [];
            const existing = included
                .filter((r: any) => r.type === 'template_fields')
                .map((f: any) => ({
                    field_id: f.id,
                    section: f.attributes?.section ?? 'General',
                    label: f.attributes?.label,
                    type: f.attributes?.type,
                    default_value: f.attributes?.options?.default ?? '',
                    required: f.attributes?.required ?? false,
                    order: f.attributes?.order ?? 0,
                    field_group_order: f.attributes?.field_group_order ?? 0,
                }))
                .sort((a: any, b: any) =>
                    a.field_group_order === b.field_group_order
                        ? a.order - b.order
                        : a.field_group_order - b.field_group_order
                );
            form.reset({
                name: a.name,
                description: a.description ?? '',
                user_id: rels?.user?.data?.id ?? '',
                test_id: rels?.test?.data?.id ?? '',
                hospital_id: rels?.hospital?.data?.id ?? '',
                fields: existing,
            });
        }
    }, [data, form]);

    async function onSubmit(values: any) {
        try {
            await updateTemplate(id, {
                name: values.name,
                description: values.description,
                user_id: Number(values.user_id),
                test_id: Number(values.test_id),
                hospital_id: Number(values.hospital_id),
            });
            if (values.fields?.length) {
                const newFields = values.fields.filter(
                    (f: any) => !f.field_id
                );
                if (newFields.length) {
                    await Promise.all(
                        newFields.map((f: any, idx: number) =>
                            createTemplateField({
                                template_id: Number(id),
                                section: f.section || 'General',
                                label: f.label,
                                type: f.type,
                                order: idx + 1,
                                required: f.required,
                                options: f.default_value
                                    ? { default: f.default_value }
                                    : null,
                            })
                        )
                    );
                }
            }
            router.push('/templates');
        } catch (e) {
            console.error(e);
            alert('Failed to save');
        }
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
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Edit {templateName}</CardTitle>
                    <Button variant="destructive" onClick={onDelete} type="button">
                        Delete
                    </Button>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            <div className="space-y-2">
                                {groupedFields.map((group) => (
                                    <div key={group.section} className="space-y-2">
                                        <h3 className="font-semibold">{group.section}</h3>
                                        {group.items.map(({ field: fieldItem, index }) => (
                                            <div
                                                key={fieldItem.id}
                                                className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end"
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
                                                        <FormItem className="md:col-span-1">
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
                                                        <FormItem>
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
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`fields.${index}.default_value`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Default Value</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <div className="flex items-center space-x-2">
                                                    <FormField
                                                        control={form.control}
                                                        name={`fields.${index}.required`}
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-col items-center justify-center">
                                                                <FormLabel>Required</FormLabel>
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value}
                                                                        onCheckedChange={field.onChange}
                                                                    />
                                                                </FormControl>
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
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        append({
                                            section: 'General',
                                            label: '',
                                            type: 'text',
                                            default_value: '',
                                            required: false,
                                        })
                                    }
                                >
                                    Add Field
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

