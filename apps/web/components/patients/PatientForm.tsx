'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type PatientPayload } from '@/lib/api';

function calcAgeFromDOB(dobISO: string): number | null {
  if (!dobISO) return null;
  const dob = new Date(dobISO);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  if (age < 0 || age > 150) return null;
  return age;
}

function calcBsa(heightCm: number, weightKg: number): number | null {
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg)) return null;
  if (heightCm <= 0 || weightKg <= 0) return null;
  const bsa = 0.007184 * Math.pow(heightCm, 0.725) * Math.pow(weightKg, 0.425);
  if (!Number.isFinite(bsa) || bsa <= 0) return null;
  return Math.round(bsa * 100) / 100;
}

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

/**
 * `mode` controls which fields are rendered:
 *  - `full` (default): the canonical form used on the patient CRUD pages.
 *  - `quick`: only MRN, Name, Gender, Hospital, User — used by the "Add
 *    patient" modal during report creation. All other fields stay in the
 *    payload as null/empty so the existing PatientPayload contract is unchanged.
 */
export type PatientFormMode = 'full' | 'quick';

export default function PatientForm({
  initialValues,
  hospitals,
  users,
  onSubmit,
  onDelete,
  submitLabel = 'Save',
  resetKey,
  mode = 'full',
}: {
  initialValues: PatientFormValues;
  hospitals: Option[];
  users: Option[];
  onSubmit: (p: PatientPayload) => Promise<void>;
  onDelete?: () => Promise<void>;
  submitLabel?: string;
  resetKey?: string;
  mode?: PatientFormMode;
}) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Track whether the user has manually edited Age or BSA in this session.
  // While unset, the auto-calc effects below keep them in sync with DOB /
  // height / weight. After a manual edit the effects stop overwriting so
  // a doctor's correction is preserved.
  const ageManuallyEditedRef = useRef(false);
  const bsaManuallyEditedRef = useRef(false);

  useEffect(() => {
    setValues(initialValues);
    setError(null);
    ageManuallyEditedRef.current = false;
    bsaManuallyEditedRef.current = false;
    // Intentionally only depending on resetKey to avoid resets when parent recreates initialValues.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Auto-fill Age from DOB unless the user has typed an Age value in this
  // session. Clearing DOB does not clear Age.
  useEffect(() => {
    if (ageManuallyEditedRef.current) return;
    const next = calcAgeFromDOB(values.dob);
    if (next === null) return;
    const nextStr = String(next);
    if (values.age === nextStr) return;
    setValues((prev) => ({ ...prev, age: nextStr }));
  }, [values.dob, values.age]);

  // Auto-fill BSA via DuBois unless the user has typed a BSA value.
  // Clearing height or weight does not clear BSA.
  useEffect(() => {
    if (bsaManuallyEditedRef.current) return;
    const h = Number(values.height_cm);
    const w = Number(values.weight_kg);
    const next = calcBsa(h, w);
    if (next === null) return;
    const nextStr = next.toFixed(2);
    if (values.bsa === nextStr) return;
    setValues((prev) => ({ ...prev, bsa: nextStr }));
  }, [values.height_cm, values.weight_kg, values.bsa]);

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
  const isQuick = mode === 'quick';

  return (
    <form onSubmit={submit} className='space-y-3'>
      {error && <p className='text-sm text-destructive'>{error}</p>}
      <div className='grid gap-3 md:grid-cols-2'>
        <div className='space-y-1'>
          <Label>
            MRN <Required />
          </Label>
          <Input disabled={submitting} value={values.mrn} onChange={(e) => setField('mrn', e.target.value)} />
        </div>
        <div className='space-y-1'>
          <Label>
            Name <Required />
          </Label>
          <Input disabled={submitting} value={values.name} onChange={(e) => setField('name', e.target.value)} />
        </div>
        <div className='space-y-1'>
          <Label>
            Gender <Required />
          </Label>
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
        {!isQuick && (
          <>
            <div className='space-y-1'>
              <Label>Date of birth</Label>
              <Input
                disabled={submitting}
                type='date'
                value={values.dob}
                onChange={(e) => setField('dob', e.target.value)}
              />
            </div>
            <div className='space-y-1'>
              <Label>Date of service/study</Label>
              <Input
                disabled={submitting}
                type='date'
                value={values.dos}
                onChange={(e) => setField('dos', e.target.value)}
              />
            </div>
            <div className='space-y-1'>
              <Label className='flex items-center gap-2'>
                <span>Age</span>
                {!ageManuallyEditedRef.current && values.age ? (
                  <span className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground'>
                    Auto from DOB
                  </span>
                ) : null}
              </Label>
              <Input
                disabled={submitting}
                type='number'
                value={values.age}
                onChange={(e) => {
                  ageManuallyEditedRef.current = true;
                  setField('age', e.target.value);
                }}
              />
            </div>
            <div className='space-y-1'>
              <Label>Height cm</Label>
              <Input
                disabled={submitting}
                type='number'
                value={values.height_cm}
                onChange={(e) => setField('height_cm', e.target.value)}
              />
            </div>
            <div className='space-y-1'>
              <Label>Weight kg</Label>
              <Input
                disabled={submitting}
                type='number'
                value={values.weight_kg}
                onChange={(e) => setField('weight_kg', e.target.value)}
              />
            </div>
            <div className='space-y-1'>
              <Label className='flex items-center gap-2'>
                <span>BSA</span>
                {!bsaManuallyEditedRef.current && values.bsa ? (
                  <span className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground'>
                    Auto from Height &amp; Weight
                  </span>
                ) : null}
              </Label>
              <Input
                disabled={submitting}
                type='number'
                step='0.01'
                value={values.bsa}
                onChange={(e) => {
                  bsaManuallyEditedRef.current = true;
                  setField('bsa', e.target.value);
                }}
              />
            </div>
            <div className='space-y-1'>
              <Label>Blood pressure</Label>
              <Input
                disabled={submitting}
                value={values.blood_pressure}
                onChange={(e) => setField('blood_pressure', e.target.value)}
              />
            </div>
            <div className='space-y-1'>
              <Label>Referring physician</Label>
              <Input
                disabled={submitting}
                value={values.referring_physician}
                onChange={(e) => setField('referring_physician', e.target.value)}
              />
            </div>
          </>
        )}
        <div className='space-y-1'>
          <Label>
            Hospital <Required />
          </Label>
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
          <Label>
            User / Doctor <Required />
          </Label>
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
      {!isQuick && (
        <div className='space-y-1'>
          <Label>Diagnosis brief</Label>
          <Textarea
            disabled={submitting}
            value={values.diagnosis_brief}
            onChange={(e) => setField('diagnosis_brief', e.target.value)}
          />
        </div>
      )}
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
