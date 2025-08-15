'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import { createTemplate, getHospitals, getTests } from '@/lib/api';
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
import Breadcrumbs from '@/components/Breadcrumbs';

export default function NewTemplatePage() {
    const router = useRouter();
    const form = useForm({
        defaultValues: { name: '', description: '', test_id: '', hospital_id: '' },
    });

    const { data: testsData } = useSWR(['/tests'], () => getTests().then((r: any) => r));
    const { data: hospitalsData } = useSWR(['/hospitals'], () =>
        getHospitals().then((r: any) => r)
    );

    const tests = testsData?.data ?? [];
    const hospitals = hospitalsData?.data ?? [];

    async function onSubmit(values: any) {
        try {
            await createTemplate({
                ...values,
                test_id: Number(values.test_id),
                hospital_id: Number(values.hospital_id),
                user_id: 1,
            });
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
                            <Button type="submit">Save</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

