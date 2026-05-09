'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { deleteUser, getUser, updateUser } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

type UserRole = 'admin' | 'doctor' | 'staff';

function normalizeRole(value: unknown): UserRole {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'doctor' || normalized === 'staff') {
    return normalized;
  }
  return 'staff';
}

type UserFormValues = {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
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
  const { user: authedUser, refreshUser } = useAuth();
  const { mutate } = useSWRConfig();
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
      role: normalizeRole(a.role),
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
      await Promise.all([mutate(['/users', id]), mutate(['/users'])]);
      // If the admin edited their own record, refresh the cached auth user.
      if (authedUser?.id != null && String(authedUser.id) === String(id)) {
        await refreshUser();
      }
      form.setValue('password', '');
      toast.success('User saved.');
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
                    <FormControl>
                      <select
                        className='border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
                        value={field.value}
                        onChange={(event) => field.onChange(normalizeRole(event.target.value))}
                      >
                        <option value='admin'>admin</option>
                        <option value='doctor'>doctor</option>
                        <option value='staff'>staff</option>
                      </select>
                    </FormControl>
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
