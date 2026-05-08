'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import { deleteUser, getUser, updateUser } from '@/lib/api';
import Breadcrumbs from '@/components/Breadcrumbs';
import DoctorSignatorySection from '@/components/users/DoctorSignatorySection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type UserFormValues = { name: string; email: string; phone: string; role: 'admin' | 'doctor' | 'staff'; position_title: string; password: string };
const parseErr = async (err: any, fallback: string) => err?.response ? await err.response.json().then((r: any) => Object.values(r?.errors ?? {}).flat().join(' ')).catch(() => fallback) : fallback;

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<UserFormValues>({ defaultValues: { name: '', email: '', phone: '', role: 'staff', position_title: '', password: '' } });
  const { data: userRes } = useSWR(id ? ['/users', id] : null, () => getUser(id));
  const userName = userRes?.data?.attributes?.name ?? 'User';

  useEffect(() => {
    if (!userRes?.data) return;
    const a = userRes.data.attributes;
    form.reset({ name: a.name ?? '', email: a.email ?? '', phone: a.phone ?? '', role: a.role ?? 'staff', position_title: a.positionTitle ?? '', password: '' });
  }, [form, userRes]);

  return <div className='space-y-4'><Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Users', href: '/users' }, { label: userName }]} /><Card><CardHeader className='flex flex-row items-center justify-between'><CardTitle>Edit User</CardTitle><Button type='button' variant='destructive' onClick={async () => { setError(null); try { await deleteUser(id); router.push('/users'); } catch (e: any) { setError(await parseErr(e, 'Failed to delete user.')); } }}>Delete</Button></CardHeader><CardContent>{error && <p className='mb-3 text-sm text-destructive'>{error}</p>}<Form {...form}><form onSubmit={form.handleSubmit(async (v) => { setError(null); const p: any = { ...v }; if (!p.password) delete p.password; try { await updateUser(id, p); router.push('/users'); } catch (e: any) { setError(await parseErr(e, 'Failed to save user.')); } })} className='space-y-4'><FormField control={form.control} name='name' render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name='email' render={({ field }) => <FormItem><FormLabel>Email</FormLabel><FormControl><Input type='email' {...field} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name='phone' render={({ field }) => <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name='role' render={({ field }) => <FormItem><FormLabel>Role</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value='admin'>admin</SelectItem><SelectItem value='doctor'>doctor</SelectItem><SelectItem value='staff'>staff</SelectItem></SelectContent></Select></FormItem>} /><FormField control={form.control} name='position_title' render={({ field }) => <FormItem><FormLabel>Position Title</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} /><FormField control={form.control} name='password' render={({ field }) => <FormItem><FormLabel>Password</FormLabel><FormControl><Input type='password' {...field} /></FormControl></FormItem>} /><Button type='submit'>Save</Button></form></Form></CardContent></Card>{form.watch('role') === 'doctor' ? <DoctorSignatorySection userId={id} userName={form.watch('name') || userName} positionTitle={form.watch('position_title') || ''} /> : null}</div>;
}
