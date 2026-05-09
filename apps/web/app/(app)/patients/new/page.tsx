'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PatientForm, { type PatientFormValues } from '@/components/patients/PatientForm';
import { createPatient, getHospitals } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';

type Hospital = { id: number; name: string };

export default function NewPatientPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const { data: hospitalsRes, error: hospitalsError, isLoading: hospitalsLoading } = useSWR(
    '/hospitals',
    () => getHospitals(),
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

  if (authLoading || !user?.id) {
    return wrap(<p className='text-sm text-muted-foreground'>Loading user…</p>);
  }

  if (hospitalsLoading) {
    return wrap(<p className='text-sm text-muted-foreground'>Loading hospitals…</p>);
  }

  if (hospitalsError) {
    return wrap(<p className='text-sm text-destructive'>Unable to load hospitals.</p>);
  }

  if (hospitals.length === 0) {
    return wrap(<p className='text-sm text-muted-foreground'>No hospitals available.</p>);
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
    user_id: String(user.id),
  };

  const users = [{ id: Number(user.id), name: user.name ?? `User ${user.id}`, role: user.role ?? 'user' }];

  return (
    <div className='space-y-4'>
      {breadcrumbs}
      <Card>
        <CardHeader>
          <CardTitle>New Patient</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-xs text-muted-foreground'>
            Patient will be assigned to the current user. Admin reassignment can be added later.
          </p>
          <PatientForm
            resetKey={`new-${user.id}`}
            initialValues={initial}
            hospitals={hospitals}
            users={users}
            onSubmit={async (payload) => {
              try {
                await createPatient(payload);
                router.push('/patients');
              } catch (err: any) {
                const msg = err?.response
                  ? await err.response
                      .json()
                      .then((r: any) => Object.values(r?.errors ?? {}).flat().join(' '))
                      .catch(() => null)
                  : null;
                throw new Error(msg || 'Failed to create patient.');
              }
            }}
            submitLabel='Create Patient'
          />
        </CardContent>
      </Card>
    </div>
  );
}
