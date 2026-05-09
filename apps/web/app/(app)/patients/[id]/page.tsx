'use client';

import { useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PatientForm, { type PatientFormValues } from '@/components/patients/PatientForm';
import { deletePatient, getHospitals, getPatient, getUsers, updatePatient } from '@/lib/api';
import { parseApiError } from '@/lib/parseApiError';
import { useAuth } from '@/components/auth-provider';

type Hospital = { id: number; name: string };
type UserOption = { id: number; name: string; role: string };

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { mutate } = useSWRConfig();
  const [saveCount, setSaveCount] = useState(0);

  const { data, error: patientError, isLoading: patientLoading } = useSWR(
    params?.id ? ['/patients', params.id] : null,
    () => getPatient(params.id),
  );
  const isAdmin = user?.role === 'admin';

  const { data: hospitalsRes, error: hospitalsError, isLoading: hospitalsLoading } = useSWR(
    '/hospitals',
    () => getHospitals(),
  );

  const { data: usersRes, isLoading: usersLoading } = useSWR(
    isAdmin ? '/users' : null,
    () => getUsers(),
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

  const users = useMemo<UserOption[]>(() => {
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
        if (effectiveUserId > 0 && !adminUsers.some((u) => u.id === effectiveUserId)) {
          adminUsers.push({ id: effectiveUserId, name: 'Assigned User', role: 'user' });
        }
        return adminUsers;
      }
    }
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
  }, [effectiveUserId, user, isAdmin, usersRes]);

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

  if (authLoading || patientLoading || hospitalsLoading || (isAdmin && usersLoading)) {
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
            {isAdmin
              ? 'Admins may reassign this patient to any user/doctor.'
              : 'Patient remains assigned to its current user.'}
          </p>
          <PatientForm
            resetKey={`edit-${params.id}-${users.length}-${saveCount}`}
            initialValues={initial}
            hospitals={hospitals}
            users={users}
            submitLabel='Save Patient'
            onSubmit={async (payload) => {
              try {
                await updatePatient(params.id, payload);
                await Promise.all([
                  mutate(['/patients', params.id]),
                  mutate(['/patients']),
                ]);
                setSaveCount((n) => n + 1);
                toast.success('Patient saved.');
              } catch (err: any) {
                throw new Error(await parseApiError(err, 'Failed to update patient.'));
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
