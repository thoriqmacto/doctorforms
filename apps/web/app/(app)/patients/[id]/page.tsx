'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PatientForm, { type PatientFormValues } from '@/components/patients/PatientForm';
import { deletePatient, getHospitals, getPatient, updatePatient } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';

type Hospital = { id: number; name: string };

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const { data, error: patientError, isLoading: patientLoading } = useSWR(
    params?.id ? ['/patients', params.id] : null,
    () => getPatient(params.id),
  );
  const { data: hospitalsRes, error: hospitalsError, isLoading: hospitalsLoading } = useSWR(
    '/hospitals',
    () => getHospitals(),
  );

  const p = data?.data;
  const a = p?.attributes ?? {};

  const hospitals: Hospital[] = useMemo(() => {
    const raw = Array.isArray(hospitalsRes?.data) ? hospitalsRes!.data : [];
    return raw
      .map((h: any) => ({
        id: Number(h?.id),
        name: typeof h?.attributes?.name === 'string' ? h.attributes.name : `Hospital ${h?.id ?? ''}`,
      }))
      .filter((h: Hospital) => Number.isFinite(h.id) && h.id > 0 && h.name.trim().length > 0);
  }, [hospitalsRes]);

  const patientUserId = Number(p?.relationships?.user?.data?.id ?? 0);
  const effectiveUserId = patientUserId > 0 ? patientUserId : Number(user?.id ?? 0);

  const users = useMemo(() => {
    if (effectiveUserId > 0) {
      const isCurrent = user?.id != null && Number(user.id) === effectiveUserId;
      const rawName = isCurrent ? user?.name : null;
      const name =
        typeof rawName === 'string' && rawName.trim().length > 0
          ? rawName
          : isCurrent
            ? `User ${effectiveUserId}`
            : 'Assigned User';
      const role = isCurrent ? (user?.role ?? 'user') : 'user';
      return [{ id: effectiveUserId, name, role }];
    }
    return [];
  }, [effectiveUserId, user]);

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Patients', href: '/patients' },
        { label: a.name ?? 'Patient' },
      ]}
    />
  );

  const wrap = (content: React.ReactNode) => (
    <div className='space-y-4'>
      {breadcrumbs}
      <Card>
        <CardHeader>
          <CardTitle>Edit Patient</CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    </div>
  );

  if (authLoading || patientLoading || hospitalsLoading) {
    return wrap(<p className='text-sm text-muted-foreground'>Loading…</p>);
  }

  if (patientError || !p) {
    return wrap(<p className='text-sm text-destructive'>Unable to load patient details.</p>);
  }

  if (hospitalsError) {
    return wrap(<p className='text-sm text-destructive'>Unable to load hospitals.</p>);
  }

  if (effectiveUserId <= 0) {
    return wrap(<p className='text-sm text-destructive'>Assigned user is unavailable.</p>);
  }

  const initial: PatientFormValues = {
    mrn: a.mrn ?? '',
    name: a.name ?? '',
    gender: a.gender === 'female' ? 'female' : 'male',
    dob: a.dob ?? '',
    dos: a.dos ?? '',
    age: a.age != null ? String(a.age) : '',
    height_cm: a.height_cm != null ? String(a.height_cm) : '',
    weight_kg: a.weight_kg != null ? String(a.weight_kg) : '',
    bsa: a.bsa != null ? String(a.bsa) : '',
    blood_pressure: a.blood_pressure ?? '',
    diagnosis_brief: a.diagnosis_brief ?? '',
    referring_physician: a.referring_physician ?? '',
    hospital_id: String(p?.relationships?.hospital?.data?.id ?? ''),
    user_id: effectiveUserId > 0 ? String(effectiveUserId) : '',
  };

  return (
    <div className='space-y-4'>
      {breadcrumbs}
      <Card>
        <CardHeader>
          <CardTitle>Edit Patient</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-xs text-muted-foreground'>
            Patient remains assigned to its current user. Admin reassignment can be added later.
          </p>
          <PatientForm
            resetKey={`edit-${params.id}`}
            initialValues={initial}
            hospitals={hospitals}
            users={users}
            submitLabel='Save Patient'
            onSubmit={async (payload) => {
              try {
                await updatePatient(params.id, payload);
                router.push('/patients');
              } catch (err: any) {
                const msg = err?.response
                  ? await err.response
                      .json()
                      .then((r: any) => Object.values(r?.errors ?? {}).flat().join(' '))
                      .catch(() => null)
                  : null;
                throw new Error(msg || 'Failed to update patient.');
              }
            }}
            onDelete={async () => {
              if (!confirm('Delete this patient?')) return;
              await deletePatient(params.id);
              router.push('/patients');
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
