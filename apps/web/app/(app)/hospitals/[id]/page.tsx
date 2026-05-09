'use client';

import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { getHospital, updateHospital, deleteHospital } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import HospitalLogoUploader from '@/components/HospitalLogoUploader';
import Breadcrumbs from '@/components/Breadcrumbs';

const HOSPITAL_FIELD_CONFIG = [
    { name: 'name', label: 'Name', required: true, input: 'text', section: 'identity' },
    { name: 'short_name', label: 'Short Name', input: 'text', section: 'identity' },
    { name: 'parent_org_line', label: 'Parent Organization Line', input: 'text', section: 'identity' },
    { name: 'address', label: 'Address', required: true, input: 'textarea', section: 'address' },
    { name: 'address_line_1', label: 'Address Line 1', input: 'text', section: 'address' },
    { name: 'address_line_2', label: 'Address Line 2', input: 'text', section: 'address' },
    { name: 'province', label: 'Province', input: 'text', section: 'address' },
    { name: 'city', label: 'City', input: 'text', section: 'address' },
    { name: 'postal_code', label: 'Postal Code', input: 'text', section: 'address' },
    { name: 'country', label: 'Country', input: 'text', section: 'address' },
    { name: 'phone', label: 'Phone', input: 'text', section: 'contact' },
    { name: 'fax', label: 'Fax', input: 'text', section: 'contact' },
    { name: 'whatsapp_phone', label: 'WhatsApp Phone', input: 'text', section: 'contact' },
    { name: 'email', label: 'Email', input: 'email', section: 'contact' },
    { name: 'website', label: 'Website', input: 'text', section: 'contact' },
    { name: 'accreditation_text', label: 'Accreditation Text', input: 'textarea', section: 'report' },
    { name: 'report_footer_line', label: 'Report Footer Line', input: 'textarea', section: 'report' },
] as const;

const SECTION_ORDER = [
    { key: 'identity', title: 'Identity' },
    { key: 'address', title: 'Address' },
    { key: 'contact', title: 'Contact' },
    { key: 'logos', title: 'Logos' },
    { key: 'report', title: 'Report metadata' },
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
            form.reset(Object.fromEntries(HOSPITAL_FIELD_CONFIG.map((field) => [field.name, a[field.name] ?? ''])));
        }
    }, [data, form]);

    async function onSubmit(values: any) {
        try {
            await updateHospital(id, values);
            await mutate();
            toast.success('Hospital saved.');
        } catch (e) {
            console.error(e);
            toast.error('Failed to save hospital.');
        }
    }

    async function onDelete() {
        const confirmed = window.confirm('This will delete the hospital and cannot be undone.');
        if (!confirmed) return;

        try {
            await deleteHospital(id);
            router.push('/hospitals');
        } catch (e) {
            console.error(e);
            alert('Failed to delete');
        }
    }

    return (
        <div className="space-y-4 pb-24">
            <Breadcrumbs
                items={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Hospitals', href: '/hospitals' },
                    { label: name },
                ]}
            />
            <Card>
                <CardHeader>
                    <CardTitle>Edit Hospital</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {SECTION_ORDER.map((section) => {
                                if (section.key === 'logos') {
                                    return (
                                        <section key={section.key} className="space-y-4 rounded-lg border p-4">
                                            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                                {section.title}
                                            </h3>
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div className="space-y-3 rounded-md border p-3">
                                                    <HospitalLogoUploader
                                                        hospitalId={id}
                                                        slot="primary"
                                                        currentUrl={data?.data?.attributes?.logo_url}
                                                        label="Primary logo"
                                                        onUploaded={() => mutate()}
                                                        onDeleted={() => mutate()}
                                                    />
                                                </div>
                                                <div className="space-y-3 rounded-md border p-3">
                                                    <HospitalLogoUploader
                                                        hospitalId={id}
                                                        slot="secondary"
                                                        currentUrl={data?.data?.attributes?.secondary_logo_url}
                                                        label="Secondary logo"
                                                        onUploaded={() => mutate()}
                                                        onDeleted={() => mutate()}
                                                    />
                                                </div>
                                            </div>
                                        </section>
                                    );
                                }

                                const fields = HOSPITAL_FIELD_CONFIG.filter((field) => field.section === section.key);
                                return (
                                    <section key={section.key} className="space-y-4 rounded-lg border p-4">
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                            {section.title}
                                        </h3>
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            {fields.map((field) => (
                                                <div
                                                    key={field.name}
                                                    className={field.input === 'textarea' ? 'md:col-span-2' : undefined}
                                                >
                                                    <FormField
                                                        control={form.control}
                                                        name={field.name}
                                                        rules={
                                                            'required' in field && field.required
                                                                ? { required: `${field.label} is required` }
                                                                : undefined
                                                        }
                                                        render={({ field: formField }) => (
                                                            <FormItem>
                                                                <FormLabel>{field.label}</FormLabel>
                                                                <FormControl>
                                                                    {field.input === 'textarea' ? (
                                                                        <Textarea {...formField} />
                                                                    ) : (
                                                                        <Input type={field.input} {...formField} />
                                                                    )}
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                );
                            })}

                            <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t bg-background/95 px-4 py-3 backdrop-blur">
                                <div className="flex items-center justify-between gap-2">
                                    <Button variant="destructive" onClick={onDelete} type="button">
                                        Delete
                                    </Button>
                                    <Button type="submit" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting ? 'Saving...' : 'Save'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
