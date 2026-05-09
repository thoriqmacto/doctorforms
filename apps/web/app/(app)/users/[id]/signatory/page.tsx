'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import Breadcrumbs from '@/components/Breadcrumbs';
import ClientErrorBoundary from '@/components/ClientErrorBoundary';
import DoctorSignatorySection from '@/components/users/DoctorSignatorySection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUser } from '@/lib/api';

export default function UserSignatoryPage() {
  const { id } = useParams<{ id: string }>();
  const { data: userRes, error: userError, isLoading } = useSWR(
    id ? ['/users', id, 'signatory'] : null,
    () => getUser(id),
  );

  const user = userRes?.data;
  const attrs = user?.attributes ?? {};
  const userName: string = attrs.name ?? 'User';
  const role: string = attrs.role ?? '';
  const positionTitle: string = attrs.positionTitle ?? attrs.position_title ?? '';

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Users', href: '/users' },
        { label: userName, href: id ? `/users/${id}` : undefined },
        { label: 'Signature' },
      ]}
    />
  );

  const backButton = (
    <Button asChild variant='outline'>
      <Link href={id ? `/users/${id}` : '/users'}>Back to User</Link>
    </Button>
  );

  if (isLoading) {
    return (
      <div className='space-y-4'>
        {breadcrumbs}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between'>
            <CardTitle>Doctor Signature</CardTitle>
            {backButton}
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>Loading…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className='space-y-4'>
        {breadcrumbs}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between'>
            <CardTitle>Doctor Signature</CardTitle>
            {backButton}
          </CardHeader>
          <CardContent>
            <p className='text-sm text-destructive'>Unable to load user.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (role !== 'doctor') {
    return (
      <div className='space-y-4'>
        {breadcrumbs}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between'>
            <CardTitle>Doctor Signature</CardTitle>
            {backButton}
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>
              Signature management is only available for doctor users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {breadcrumbs}
      <div className='flex justify-end'>{backButton}</div>
      <ClientErrorBoundary
        fallback={
          <Card>
            <CardHeader>
              <CardTitle>Doctor Signature</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-destructive'>Signature editor failed to load.</p>
            </CardContent>
          </Card>
        }
      >
        <DoctorSignatorySection
          userId={id}
          userName={userName}
          positionTitle={positionTitle}
        />
      </ClientErrorBoundary>
    </div>
  );
}
