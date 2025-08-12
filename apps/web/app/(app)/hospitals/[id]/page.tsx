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

export default function EditHospitalPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const { data, mutate } = useSWR(id ? ['/hospitals', id] : null, () => getHospital(id));
    const form = useForm({
        defaultValues: { name: '', address: '', phone: '', email: '' },
    });

    useEffect(() => {
        if (data?.data) {
            const a = data.data.attributes;
            form.reset({
                name: a.name,
                address: a.address,
                phone: a.phone ?? '',
                email: a.email ?? '',
            });
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
                                name="address"
                                rules={{ required: 'Address is required' }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Address</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input type="email" {...field} />
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
