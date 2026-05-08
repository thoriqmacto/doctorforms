'use client';

import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getHospital, updateHospital, deleteHospital } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import HospitalLogoUploader from '@/components/HospitalLogoUploader';
import HospitalAvatar from '@/components/HospitalAvatar';
import Breadcrumbs from '@/components/Breadcrumbs';

const HOSPITAL_FIELD_CONFIG = [
    { name: 'name', label: 'Name', required: true, input: 'text' },
    { name: 'short_name', label: 'Short Name', input: 'text' },
    { name: 'parent_org_line', label: 'Parent Organization Line', input: 'text' },
    { name: 'address', label: 'Address', required: true, input: 'textarea' },
    { name: 'address_line_1', label: 'Address Line 1', input: 'text' },
    { name: 'address_line_2', label: 'Address Line 2', input: 'text' },
    { name: 'province', label: 'Province', input: 'text' },
    { name: 'city', label: 'City', input: 'text' },
    { name: 'postal_code', label: 'Postal Code', input: 'text' },
    { name: 'country', label: 'Country', input: 'text' },
    { name: 'phone', label: 'Phone', input: 'text' },
    { name: 'fax', label: 'Fax', input: 'text' },
    { name: 'whatsapp_phone', label: 'WhatsApp Phone', input: 'text' },
    { name: 'email', label: 'Email', input: 'email' },
    { name: 'website', label: 'Website', input: 'text' },
    { name: 'secondary_logo_url', label: 'Secondary Logo URL', input: 'text' },
    { name: 'accreditation_text', label: 'Accreditation Text', input: 'textarea' },
    { name: 'report_footer_line', label: 'Report Footer Line', input: 'textarea' },
] as const;

export default function EditHospitalPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const { data, mutate } = useSWR(id ? ['/hospitals', id] : null, () => getHospital(id));
    const name = data?.data?.attributes?.name ?? 'Hospital';
    const form = useForm({
        defaultValues: Object.fromEntries(HOSPITAL_FIELD_CONFIG.map((field) => [field.name, ''])),
    });

    useEffect(() => {
        if (data?.data) {
            const a = data.data.attributes;
            form.reset(
                Object.fromEntries(
                    HOSPITAL_FIELD_CONFIG.map((field) => [field.name, a[field.name] ?? ''])
                )
            );
        }
    }, [data, form]);

    async function onSubmit(values: any) {
        try {
            await updateHospital(id, values);
            router.push('/hospitals');
        } catch (e) {
            console.error(e);
            alert('Failed to save');
        }
    }

    async function onDelete() {
        try {
            await deleteHospital(id);
            router.push('/hospitals');
        } catch (e) {
            console.error(e);
            alert('Failed to delete');
        }
    }

    return (
        <div className="space-y-4">
            <Breadcrumbs
                items={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Hospitals', href: '/hospitals' },
                    { label: name },
                ]}
            />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Edit Hospital</CardTitle>
                    <Button variant="destructive" onClick={onDelete} type="button">
                        Delete
                    </Button>
                </CardHeader>
                <CardContent>
                    {data?.data && (
                        <div className="mb-4 space-y-4">
                            <HospitalAvatar
                                name={data.data.attributes.name}
                                logoUrl={data.data.attributes.logo_url}
                            />
                            <HospitalLogoUploader hospitalId={id} onUploaded={() => mutate()} />
                        </div>
                    )}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            {HOSPITAL_FIELD_CONFIG.map((config) => (
                                <FormField
                                    key={config.name}
                                    control={form.control}
                                    name={config.name}
                                    rules={
                                        'required' in config && config.required
                                            ? { required: `${config.label} is required` }
                                            : undefined
                                    }
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{config.label}</FormLabel>
                                            <FormControl>
                                                {config.input === 'textarea' ? (
                                                    <Textarea {...field} />
                                                ) : (
                                                    <Input type={config.input} {...field} />
                                                )}
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ))}
                            <Button type="submit">Save</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
