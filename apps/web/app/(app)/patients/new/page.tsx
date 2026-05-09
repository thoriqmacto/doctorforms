'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PatientForm, { type PatientFormValues } from '@/components/patients/PatientForm';
import { createPatient, getHospitals, getUsers } from '@/lib/api';
import { parseApiError } from '@/lib/parseApiError';
import { useAuth } from '@/components/auth-provider';

type Hospital = { id: number; name: string };
type UserOption = { id: number; name: string; role: string };

export default function NewPatientPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const isAdmin = user?.role === 'admin';

  const { data: hospitalsRes, error: hospitalsError, isLoading: hospitalsLoading } = useSWR(
    '/hospitals',
    () => getHospitals(),
  );

  const { data: usersRes, isLoading: usersLoading } = useSWR(
    isAdmin ? '/users' : null,
    () => getUsers(),
  );

  const hospitals: Hospital[] = useMemo(() => {
    const raw = Array.isArray(hospitalsRes?.data) ? hospitalsRes!.data : [];
    return raw
      .map((h: any) => ({
        id: Number(h?.id),
        name: typeof h?.attributes?.name === 'string' ? h.attributes.name : `Hospital ${h?.id ?? ''}`,
      }))
      .filter((h: Hospital) => Number.isFinite(h.id) && h.id > 0 && h.name.trim().length > 0);
  }, [hospitalsRes]);

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Patients', href: '/patients' },
        { label: 'New Patient' },
      ]}
    />
  );

  const wrap = (content: React.ReactNode) => (
    <div className='space-y-4'>
      {breadcrumbs}
      <Card>
        <CardHeader>
          <CardTitle>New Patient</CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    </div>
  );

  if (authLoading) {
    return wrap(<p className='text-sm text-muted-foreground'>Loading user…</p>);
  }

  if (!user?.id) {
    return wrap(
      <p className='text-sm text-destructive'>Authenticated user is unavailable. Please sign in again.</p>,
    );
  }

  if (hospitalsLoading || (isAdmin && usersLoading)) {
    return wrap(<p className='text-sm text-muted-foreground'>Loading…</p>);
  }

  if (hospitalsError) {
    return wrap(<p className='text-sm text-destructive'>Unable to load hospitals.</p>);
  }

  if (hospitals.length === 0) {
    return wrap(<p className='text-sm text-muted-foreground'>No hospitals available.</p>);
  }

  const safeCurrentUserName =
    typeof user.name === 'string' && user.name.trim().length > 0 ? user.name : `User ${user.id}`;

  let users: UserOption[] = [
    { id: Number(user.id), name: safeCurrentUserName, role: user.role ?? 'user' },
  ];
  let defaultUserId = Number(user.id);

  if (isAdmin) {
    const rawUsers = Array.isArray(usersRes?.data) ? usersRes!.data : [];
    const adminUsers: UserOption[] = rawUsers
      .map((u: any) => {
        const id = Number(u?.id);
        const rawName = u?.attributes?.name;
        const name =
          typeof rawName === 'string' && rawName.trim().length > 0
            ? rawName
            : `User ${Number.isFinite(id) ? id : ''}`;
        const role =
          typeof u?.attributes?.role === 'string' && u.attributes.role.trim().length > 0
            ? u.attributes.role
            : 'user';
        return { id, name, role };
      })
      .filter(
        (u: UserOption) =>
          Number.isFinite(u.id) && u.id > 0 && typeof u.name === 'string' && u.name.trim().length > 0,
      );

    if (adminUsers.length > 0) {
      users = adminUsers;
      const firstDoctor = adminUsers.find((u) => u.role === 'doctor');
      const self = adminUsers.find((u) => u.id === Number(user.id));
      defaultUserId = (self ?? firstDoctor ?? adminUsers[0]).id;
    }
  }

  const initial: PatientFormValues = {
    mrn: '',
    name: '',
    gender: 'male',
    dob: '',
    dos: '',
    age: '',
    height_cm: '',
    weight_kg: '',
    bsa: '',
    blood_pressure: '',
    diagnosis_brief: '',
    referring_physician: '',
    hospital_id: '',
    user_id: String(defaultUserId),
  };

  return (
    <div className='space-y-4'>
      {breadcrumbs}
      <Card>
        <CardHeader>
          <CardTitle>New Patient</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-xs text-muted-foreground'>
            {isAdmin
              ? 'Admins may assign this patient to any user/doctor.'
              : 'Patient will be assigned to the current user.'}
          </p>
          <PatientForm
            resetKey={`new-${user.id}-${users.length}`}
            initialValues={initial}
            hospitals={hospitals}
            users={users}
            onSubmit={async (payload) => {
              try {
                await createPatient(payload);
                router.push('/patients');
              } catch (err: any) {
                throw new Error(await parseApiError(err, 'Failed to create patient.'));
              }
            }}
            submitLabel='Create Patient'
          />
        </CardContent>
      </Card>
    </div>
  );
}
