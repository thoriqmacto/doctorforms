'use client';
import { useMemo } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PatientForm, { type PatientFormValues } from '@/components/patients/PatientForm';
import { deletePatient, getHospitals, getPatient, getUsers, updatePatient } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>(); const router = useRouter(); const { user } = useAuth(); const isAdmin = user?.role === 'admin';
  const { data, error: patientError } = useSWR(params?.id ? ['/patients', params.id] : null, () => getPatient(params.id));
  const { data: hospitalsRes, error: hospitalsError } = useSWR('/hospitals', () => getHospitals());
  const { data: usersRes, error: usersError } = useSWR(isAdmin ? '/users' : null, () => getUsers());
  const p = data?.data; const a = p?.attributes ?? {};
  const hospitals = (hospitalsRes?.data ?? []).map((h: any) => ({ id: Number(h.id), name: h.attributes?.name ?? `Hospital ${h.id}` }));
  const users = useMemo(() => { const patientUserId = Number(p?.relationships?.user?.data?.id ?? 0); if (isAdmin) return (usersRes?.data ?? []).map((u: any) => ({ id: Number(u.id), name: u.attributes?.name ?? `User ${u.id}`, role: u.attributes?.role })); if (user?.id) return [{ id: Number(user.id), name: user.name ?? `User ${user.id}`, role: user.role ?? 'user' }]; if (patientUserId > 0) return [{ id: patientUserId, name: 'Assigned User', role: 'user' }]; return []; }, [isAdmin, p, user, usersRes]);

  if (!p && !patientError) return <div className='space-y-4'><Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Patients', href: '/patients' }, { label: 'Patient' }]} /><Card><CardHeader><CardTitle>Edit Patient</CardTitle></CardHeader><CardContent>Loading…</CardContent></Card></div>;
  if (patientError || !p) return <div className='space-y-4'><Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Patients', href: '/patients' }, { label: 'Patient' }]} /><Card><CardHeader><CardTitle>Edit Patient</CardTitle></CardHeader><CardContent><p className='text-sm text-destructive'>Unable to load patient details.</p></CardContent></Card></div>;

  const initial: PatientFormValues = { mrn: a.mrn ?? '', name: a.name ?? '', gender: (a.gender === 'female' ? 'female' : 'male'), dob: a.dob ?? '', dos: a.dos ?? '', age: a.age != null ? String(a.age) : '', height_cm: a.height_cm != null ? String(a.height_cm) : '', weight_kg: a.weight_kg != null ? String(a.weight_kg) : '', bsa: a.bsa != null ? String(a.bsa) : '', blood_pressure: a.blood_pressure ?? '', diagnosis_brief: a.diagnosis_brief ?? '', referring_physician: a.referring_physician ?? '', hospital_id: String(p?.relationships?.hospital?.data?.id ?? ''), user_id: String((isAdmin ? p?.relationships?.user?.data?.id : user?.id ?? p?.relationships?.user?.data?.id) ?? '') };

  return <div className='space-y-4'><Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Patients', href: '/patients' }, { label: a.name ?? 'Patient' }]} /><Card><CardHeader><CardTitle>Edit Patient</CardTitle></CardHeader><CardContent>{hospitalsError ? <p className='text-sm text-destructive'>Unable to load hospitals for patient setup.</p> : usersError ? <p className='text-sm text-destructive'>Unable to load users for patient setup.</p> : <PatientForm resetKey={`${params.id}-${initial.user_id}-${hospitals.length}-${users.length}`} initialValues={initial} hospitals={hospitals} users={users} submitLabel='Save Patient' onSubmit={async (payload) => { try { await updatePatient(params.id, payload); router.push('/patients'); } catch (err: any) { const msg = err?.response ? await err.response.json().then((r: any) => Object.values(r?.errors ?? {}).flat().join(' ')).catch(() => null) : null; throw new Error(msg || 'Failed to update patient.'); } }} onDelete={async () => { if (!confirm('Delete this patient?')) return; await deletePatient(params.id); router.push('/patients'); }} />}</CardContent></Card></div>;
}
