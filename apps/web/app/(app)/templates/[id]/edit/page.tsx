'use client';

import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getTemplate, updateTemplate, deleteTemplate } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function EditTemplatePage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = params.id;

    const { data } = useSWR(id ? ['/templates', id] : null, () => getTemplate(id));
    const name = data?.data?.attributes?.name ?? 'Template';
    const form = useForm({ defaultValues: { name: '', description: '' } });

    useEffect(() => {
        if (data?.data) {
            const a = data.data.attributes;
            form.reset({ name: a.name, description: a.description ?? '' });
        }
    }, [data, form]);

    async function onSubmit(values: any) {
        try {
            await updateTemplate(id, values);
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

    return (
        <div className="space-y-4">
            <Breadcrumbs
                items={[
                    { label: 'Dashboard', href: '/' },
                    { label: 'Templates', href: '/templates' },
                    { label: `Edit ${name}` },
                ]}
            />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Edit {name}</CardTitle>
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
                            <Button type="submit">Save</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

