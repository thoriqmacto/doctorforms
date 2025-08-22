'use client';

import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import useSWR from 'swr';
import { createTemplate, createTemplateField, getHospitals, getTests } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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

export default function NewTemplatePage() {
    const router = useRouter();
    const form = useForm({
        defaultValues: {
            name: '',
            description: '',
            test_id: '',
            hospital_id: '',
            fields: [{ label: '', required: false }],
        },
    });
    const { fields: templateFields, append, remove } = useFieldArray({
        control: form.control,
        name: 'fields',
    });

    const { data: testsData } = useSWR(['/tests'], () => getTests().then((r: any) => r));
    const { data: hospitalsData } = useSWR(['/hospitals'], () =>
        getHospitals().then((r: any) => r)
    );

    const tests = testsData?.data ?? [];
    const hospitals = hospitalsData?.data ?? [];

    async function onSubmit(values: any) {
        try {
            const result = await createTemplate({
                ...values,
                test_id: Number(values.test_id),
                hospital_id: Number(values.hospital_id),
                user_id: 1,
            });
            const templateId = Number(result?.data?.id ?? result?.id);
            if (templateId && values.fields?.length) {
                await Promise.all(
                    values.fields.map((f: any, idx: number) =>
                        createTemplateField({
                            template_id: templateId,
                            section: 'General',
                            label: f.label,
                            type: 'text',
                            order: idx + 1,
                            required: f.required,
                        }),
                    ),
                );
            }
            router.push('/templates');
        } catch (e) {
            console.error(e);
            alert('Failed to save');
        }
    }

    return (
        <div className="space-y-4">
            <Breadcrumbs
                items={[
                    { label: 'Dashboard', href: '/' },
                    { label: 'Templates', href: '/templates' },
                    { label: 'New Template' },
                ]}
            />
            <Card>
                <CardHeader>
                    <CardTitle>New Template</CardTitle>
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
                                {templateFields.map((field, index) => (
                                    <div key={field.id} className="flex items-end gap-2">
                                        <FormField
                                            control={form.control}
                                            name={`fields.${index}.label`}
                                            rules={{ required: 'Field label is required' }}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
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
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => append({ label: '', required: false })}
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

