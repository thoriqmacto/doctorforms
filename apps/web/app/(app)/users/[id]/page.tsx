'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import { deleteUser, getUser, updateUser } from '@/lib/api';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type UserFormValues = {
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'doctor' | 'staff';
  position_title: string;
  password: string;
};

const parseErr = async (err: any, fallback: string) => {
  if (!err?.response) return fallback;
  try {
    const r = await err.response.json();
    const msg = Object.values(r?.errors ?? {}).flat().join(' ');
    return msg || fallback;
  } catch {
    return fallback;
  }
};

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<UserFormValues>({
    defaultValues: { name: '', email: '', phone: '', role: 'staff', position_title: '', password: '' },
  });

  const { data: userRes, error: userError, isLoading } = useSWR(
    id ? ['/users', id] : null,
    () => getUser(id),
  );
  const userName = userRes?.data?.attributes?.name ?? 'User';
  const role = form.watch('role');

  useEffect(() => {
    if (!userRes?.data) return;
    const a = userRes.data.attributes ?? {};
    form.reset({
      name: a.name ?? '',
      email: a.email ?? '',
      phone: a.phone ?? '',
      role: a.role ?? 'staff',
      position_title: a.positionTitle ?? a.position_title ?? '',
      password: '',
    });
  }, [form, userRes]);

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Users', href: '/users' },
        { label: userName },
      ]}
    />
  );

  if (isLoading) {
    return (
      <div className='space-y-4'>
        {breadcrumbs}
        <Card>
          <CardHeader>
            <CardTitle>Edit User</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>Loading…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (userError || !userRes?.data) {
    return (
      <div className='space-y-4'>
        {breadcrumbs}
        <Card>
          <CardHeader>
            <CardTitle>Edit User</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-destructive'>Unable to load user.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSave = form.handleSubmit(async (v) => {
    setError(null);
    setSubmitting(true);
    try {
      const payload: any = { ...v };
      if (!payload.password) delete payload.password;
      await updateUser(id, payload);
      router.push('/users');
    } catch (e: any) {
      setError(await parseErr(e, 'Failed to save user.'));
    } finally {
      setSubmitting(false);
    }
  });

  const onDelete = async () => {
    setError(null);
    setDeleting(true);
    try {
      await deleteUser(id);
      router.push('/users');
    } catch (e: any) {
      setError(await parseErr(e, 'Failed to delete user.'));
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className='space-y-4'>
      {breadcrumbs}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <CardTitle>Edit User</CardTitle>
          {confirmingDelete ? (
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='destructive'
                disabled={deleting}
                onClick={onDelete}
              >
                {deleting ? 'Deleting…' : 'Confirm Delete'}
              </Button>
              <Button
                type='button'
                variant='outline'
                disabled={deleting}
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type='button'
              variant='destructive'
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {error && <p className='mb-3 text-sm text-destructive'>{error}</p>}
          <Form {...form}>
            <form onSubmit={onSave} className='space-y-4'>
              <FormField
                control={form.control}
                name='name'
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
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type='email' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='phone'
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
                name='role'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='admin'>admin</SelectItem>
                        <SelectItem value='doctor'>doctor</SelectItem>
                        <SelectItem value='staff'>staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='position_title'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type='password' placeholder='Leave blank to keep current password' {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type='submit' disabled={submitting}>
                {submitting ? 'Saving…' : 'Save'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {role === 'doctor' && (
        <Card>
          <CardHeader>
            <CardTitle>Doctor Signature</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <p className='text-sm text-muted-foreground'>
              Manage this doctor&apos;s signature from the dedicated signatory page.
            </p>
            <Button asChild variant='outline'>
              <Link href={`/users/${id}/signatory`}>Manage Signature</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
