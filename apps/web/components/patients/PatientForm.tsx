'use client';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormLabel } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { type PatientPayload } from '@/lib/api';

const SELECT_CLASS =
  'border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export type PatientFormValues = {
  mrn: string;
  name: string;
  gender: 'male' | 'female';
  dob: string;
  dos: string;
  age: string;
  height_cm: string;
  weight_kg: string;
  bsa: string;
  blood_pressure: string;
  diagnosis_brief: string;
  referring_physician: string;
  hospital_id: string;
  user_id: string;
};

type Option = { id: number; name: string; role?: string };

export const normalizePatientPayload = (v: PatientFormValues): PatientPayload => ({
  mrn: v.mrn.trim(),
  name: v.name.trim(),
  gender: v.gender,
  dob: v.dob || null,
  dos: v.dos || null,
  age: v.age ? Number(v.age) : null,
  height_cm: v.height_cm ? Number(v.height_cm) : null,
  weight_kg: v.weight_kg ? Number(v.weight_kg) : null,
  bsa: v.bsa ? Number(v.bsa) : null,
  blood_pressure: v.blood_pressure.trim() || null,
  diagnosis_brief: v.diagnosis_brief.trim() || null,
  referring_physician: v.referring_physician.trim() || null,
  hospital_id: Number(v.hospital_id),
  user_id: Number(v.user_id),
});

const Required = () => <span className='text-destructive' aria-hidden='true'>*</span>;

export default function PatientForm({
  initialValues,
  hospitals,
  users,
  onSubmit,
  onDelete,
  submitLabel = 'Save',
  resetKey,
}: {
  initialValues: PatientFormValues;
  hospitals: Option[];
  users: Option[];
  onSubmit: (p: PatientPayload) => Promise<void>;
  onDelete?: () => Promise<void>;
  submitLabel?: string;
  resetKey?: string;
}) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setValues(initialValues);
    setError(null);
    // Intentionally only depending on resetKey to avoid resets when parent recreates initialValues.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const validHospitals = useMemo(() => {
    const raw = Array.isArray(hospitals) ? hospitals : [];
    return raw
      .map((h) => {
        const id = Number(h?.id);
        const name =
          typeof h?.name === 'string' && h.name.trim().length > 0
            ? h.name
            : `Hospital ${Number.isFinite(id) ? id : ''}`;
        return { ...h, id, name };
      })
      .filter(
        (h) =>
          Number.isFinite(h.id) && h.id > 0 && typeof h.name === 'string' && h.name.trim().length > 0,
      );
  }, [hospitals]);

  const validUsers = useMemo(() => {
    const raw = Array.isArray(users) ? users : [];
    return raw
      .map((u) => {
        const id = Number(u?.id);
        const name =
          typeof u?.name === 'string' && u.name.trim().length > 0
            ? u.name
            : `User ${Number.isFinite(id) ? id : ''}`;
        return { ...u, id, name };
      })
      .filter(
        (u) =>
          Number.isFinite(u.id) && u.id > 0 && typeof u.name === 'string' && u.name.trim().length > 0,
      )
      .sort((a, b) => Number(b.role === 'doctor') - Number(a.role === 'doctor'));
  }, [users]);

  const setField = (k: keyof PatientFormValues, v: string) =>
    setValues((p) => ({ ...p, [k]: v }));
  const invalidNumber = (value: string) => value.trim().length > 0 && Number.isNaN(Number(value));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!values.mrn.trim()) return setError('MRN is required.');
    if (!values.name.trim()) return setError('Name is required.');
    if (!values.gender) return setError('Gender is required.');
    if (!values.hospital_id) return setError('Hospital is required.');
    if (!values.user_id) return setError('User is required.');
    if (
      invalidNumber(values.age) ||
      invalidNumber(values.height_cm) ||
      invalidNumber(values.weight_kg) ||
      invalidNumber(values.bsa)
    ) {
      return setError('Age, height, weight, and BSA must be valid numbers when provided.');
    }
    setSubmitting(true);
    try {
      await onSubmit(normalizePatientPayload(values));
    } catch (err: any) {
      setError(err?.message || String(err) || 'Unable to save patient.');
    } finally {
      setSubmitting(false);
    }
  }

  const singleUser = validUsers.length === 1 ? validUsers[0] : null;
  const hospitalValue = values.hospital_id ?? '';
  const userValue = values.user_id ?? '';
  const genderValue = values.gender || 'male';

  return (
    <form onSubmit={submit} className='space-y-3'>
      {error && <p className='text-sm text-destructive'>{error}</p>}
      <div className='grid gap-3 md:grid-cols-2'>
        <div className='space-y-1'>
          <FormLabel>
            MRN <Required />
          </FormLabel>
          <Input disabled={submitting} value={values.mrn} onChange={(e) => setField('mrn', e.target.value)} />
        </div>
        <div className='space-y-1'>
          <FormLabel>
            Name <Required />
          </FormLabel>
          <Input disabled={submitting} value={values.name} onChange={(e) => setField('name', e.target.value)} />
        </div>
        <div className='space-y-1'>
          <FormLabel>
            Gender <Required />
          </FormLabel>
          <select
            className={SELECT_CLASS}
            disabled={submitting}
            value={genderValue}
            onChange={(e) => setField('gender', e.target.value === 'female' ? 'female' : 'male')}
          >
            <option value='male'>male</option>
            <option value='female'>female</option>
          </select>
        </div>
        <div className='space-y-1'>
          <FormLabel>Date of birth</FormLabel>
          <Input
            disabled={submitting}
            type='date'
            value={values.dob}
            onChange={(e) => setField('dob', e.target.value)}
          />
        </div>
        <div className='space-y-1'>
          <FormLabel>Date of service/study</FormLabel>
          <Input
            disabled={submitting}
            type='date'
            value={values.dos}
            onChange={(e) => setField('dos', e.target.value)}
          />
        </div>
        <div className='space-y-1'>
          <FormLabel>Age</FormLabel>
          <Input
            disabled={submitting}
            type='number'
            value={values.age}
            onChange={(e) => setField('age', e.target.value)}
          />
        </div>
        <div className='space-y-1'>
          <FormLabel>Height cm</FormLabel>
          <Input
            disabled={submitting}
            type='number'
            value={values.height_cm}
            onChange={(e) => setField('height_cm', e.target.value)}
          />
        </div>
        <div className='space-y-1'>
          <FormLabel>Weight kg</FormLabel>
          <Input
            disabled={submitting}
            type='number'
            value={values.weight_kg}
            onChange={(e) => setField('weight_kg', e.target.value)}
          />
        </div>
        <div className='space-y-1'>
          <FormLabel>BSA</FormLabel>
          <Input
            disabled={submitting}
            type='number'
            step='0.01'
            value={values.bsa}
            onChange={(e) => setField('bsa', e.target.value)}
          />
        </div>
        <div className='space-y-1'>
          <FormLabel>Blood pressure</FormLabel>
          <Input
            disabled={submitting}
            value={values.blood_pressure}
            onChange={(e) => setField('blood_pressure', e.target.value)}
          />
        </div>
        <div className='space-y-1'>
          <FormLabel>Referring physician</FormLabel>
          <Input
            disabled={submitting}
            value={values.referring_physician}
            onChange={(e) => setField('referring_physician', e.target.value)}
          />
        </div>
        <div className='space-y-1'>
          <FormLabel>
            Hospital <Required />
          </FormLabel>
          <select
            className={SELECT_CLASS}
            disabled={submitting || validHospitals.length === 0}
            value={hospitalValue}
            onChange={(e) => setField('hospital_id', e.target.value)}
          >
            <option value=''>Select hospital</option>
            {validHospitals.map((h) => (
              <option key={h.id} value={String(h.id)}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
        <div className='space-y-1'>
          <FormLabel>
            User / Doctor <Required />
          </FormLabel>
          {singleUser ? (
            <Input disabled readOnly value={`${singleUser.name} (${singleUser.role ?? 'user'})`} />
          ) : (
            <select
              className={SELECT_CLASS}
              disabled={submitting || validUsers.length === 0}
              value={userValue}
              onChange={(e) => setField('user_id', e.target.value)}
            >
              <option value=''>Select user</option>
              {validUsers.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name} ({u.role ?? 'user'})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div className='space-y-1'>
        <FormLabel>Diagnosis brief</FormLabel>
        <Textarea
          disabled={submitting}
          value={values.diagnosis_brief}
          onChange={(e) => setField('diagnosis_brief', e.target.value)}
        />
      </div>
      <div className='flex gap-2'>
        <Button type='submit' disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
        {onDelete && (
          <Button type='button' variant='destructive' disabled={submitting} onClick={onDelete}>
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
