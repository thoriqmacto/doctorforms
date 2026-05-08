'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { createUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function NewUserPage() {
    const router = useRouter();
    const form = useForm({
        defaultValues: { name: '', email: '', phone: '', role: 'staff', position_title: '', password: '' },
    });

    async function onSubmit(values: any) {
        try {
            await createUser(values);
            router.push('/users');
        } catch (e) {
            console.error(e);
            alert('Failed to save');
        }
    }

    return (
        <div className="space-y-4">
            <Breadcrumbs
                items={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Users', href: '/users' },
                    { label: 'New User' },
                ]}
            />
            <Card>
                <CardHeader>
                    <CardTitle>New User</CardTitle>
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
                                name="email"
                                rules={{ required: 'Email is required' }}
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
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Role</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="admin">admin</SelectItem>
                                                <SelectItem value="doctor">doctor</SelectItem>
                                                <SelectItem value="staff">staff</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="position_title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Position Title</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                rules={{ required: 'Password is required' }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
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
