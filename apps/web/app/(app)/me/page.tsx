'use client';

import { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth-provider';
import { changeMyPassword, getMyProfile, updateMyProfile } from '@/lib/api';
import { parseApiError } from '@/lib/parseApiError';

type ProfileValues = {
  name: string;
  email: string;
  phone: string;
  position_title: string;
};

type PasswordValues = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

export default function MyAccountPage() {
  const { refreshUser } = useAuth();
  const { mutate } = useSWRConfig();
  const { data, isLoading, error } = useSWR(['/me/profile'], () => getMyProfile());

  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const profileForm = useForm<ProfileValues>({
    defaultValues: { name: '', email: '', phone: '', position_title: '' },
  });

  const passwordForm = useForm<PasswordValues>({
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  });

  const attrs = data?.data?.attributes ?? {};
  const role = typeof attrs.role === 'string' ? attrs.role : null;

  useEffect(() => {
    if (!data?.data) return;
    profileForm.reset({
      name: attrs.name ?? '',
      email: attrs.email ?? '',
      phone: attrs.phone ?? '',
      position_title: attrs.positionTitle ?? attrs.position_title ?? '',
    });
    // Intentional: only re-hydrate when the server payload changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const onSaveProfile = profileForm.handleSubmit(async (v) => {
    setProfileError(null);
    setSavingProfile(true);
    try {
      await updateMyProfile({
        name: v.name.trim(),
        email: v.email.trim(),
        phone: v.phone.trim() || null,
        position_title: v.position_title.trim() || null,
      });
      await mutate(['/me/profile']);
      await refreshUser();
      toast.success('Profile saved.');
    } catch (e: any) {
      setProfileError(await parseApiError(e, 'Failed to save profile.'));
    } finally {
      setSavingProfile(false);
    }
  });

  const onSavePassword = passwordForm.handleSubmit(async (v) => {
    setPasswordError(null);
    if (v.password !== v.password_confirmation) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await changeMyPassword({
        current_password: v.current_password,
        password: v.password,
        password_confirmation: v.password_confirmation,
      });
      passwordForm.reset({ current_password: '', password: '', password_confirmation: '' });
      toast.success('Password updated.');
    } catch (e: any) {
      setPasswordError(await parseApiError(e, 'Failed to update password.'));
    } finally {
      setSavingPassword(false);
    }
  });

  const breadcrumbs = (
    <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Account' }]} />
  );

  if (isLoading) {
    return (
      <div className='space-y-4'>
        {breadcrumbs}
        <Card>
          <CardHeader>
            <CardTitle>My Account</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>Loading…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className='space-y-4'>
        {breadcrumbs}
        <Card>
          <CardHeader>
            <CardTitle>My Account</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-destructive'>Unable to load your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {breadcrumbs}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <CardTitle>Profile</CardTitle>
          {role ? <Badge variant='secondary'>{role.toUpperCase()}</Badge> : null}
        </CardHeader>
        <CardContent>
          {profileError && <p className='mb-3 text-sm text-destructive'>{profileError}</p>}
          <Form {...profileForm}>
            <form onSubmit={onSaveProfile} className='space-y-4'>
              <FormField
                control={profileForm.control}
                name='name'
                rules={{ required: 'Name is required.' }}
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
                control={profileForm.control}
                name='email'
                rules={{ required: 'Email is required.' }}
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
                control={profileForm.control}
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
                control={profileForm.control}
                name='position_title'
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
              <p className='text-xs text-muted-foreground'>
                Role can only be changed by an administrator.
              </p>
              <Button type='submit' disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save Profile'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          {passwordError && <p className='mb-3 text-sm text-destructive'>{passwordError}</p>}
          <Form {...passwordForm}>
            <form onSubmit={onSavePassword} className='space-y-4'>
              <FormField
                control={passwordForm.control}
                name='current_password'
                rules={{ required: 'Current password is required.' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type='password' autoComplete='current-password' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name='password'
                rules={{
                  required: 'New password is required.',
                  minLength: { value: 8, message: 'New password must be at least 8 characters.' },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type='password' autoComplete='new-password' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name='password_confirmation'
                rules={{ required: 'Please confirm the new password.' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type='password' autoComplete='new-password' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type='submit' disabled={savingPassword}>
                {savingPassword ? 'Updating…' : 'Update Password'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
