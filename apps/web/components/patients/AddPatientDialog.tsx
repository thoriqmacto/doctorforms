'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import useSWR, { useSWRConfig } from 'swr';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import PatientForm, { type PatientFormValues } from '@/components/patients/PatientForm';
import { createPatient, getHospitals, getUsers } from '@/lib/api';
import { parseApiError } from '@/lib/parseApiError';
import { useAuth } from '@/components/auth-provider';

type Hospital = { id: number; name: string };
type UserOption = { id: number; name: string; role: string };

/**
 * Modal entry point for creating a patient without leaving the report
 * creation flow. Renders the existing PatientForm in `quick` mode so we
 * don't duplicate validation, normalization, or hospital/user wiring.
 *
 * The newly-created patient id is handed back via `onCreated` so the
 * caller (the reports list page) can set it as the selected patient.
 * Cache invalidation: we mutate ['/patients'] to match the report
 * page's own SWR key.
 */
export default function AddPatientDialog({
  defaultHospitalId,
  onCreated,
  trigger,
}: {
  defaultHospitalId?: number | null;
  onCreated?: (newPatientId: number) => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { mutate } = useSWRConfig();

  const { data: hospitalsRes, isLoading: hospitalsLoading } = useSWR(
    open ? ['/hospitals', 'add-patient-dialog'] : null,
    () => getHospitals(),
  );

  const { data: usersRes, isLoading: usersLoading } = useSWR(
    open && isAdmin ? ['/users', 'add-patient-dialog'] : null,
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

  const users: UserOption[] = useMemo(() => {
    const me = user
      ? [{ id: Number(user.id), name: user.name ?? `User ${user.id}`, role: user.role ?? 'user' }]
      : [];

    if (!isAdmin) return me;

    const raw = Array.isArray(usersRes?.data) ? usersRes!.data : [];
    const adminUsers: UserOption[] = raw
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
      .filter((u: UserOption) => Number.isFinite(u.id) && u.id > 0);
    return adminUsers.length > 0 ? adminUsers : me;
  }, [user, isAdmin, usersRes]);

  const defaultUserId = useMemo(() => {
    if (!user?.id) return '';
    const self = users.find((u) => u.id === Number(user.id));
    return String((self ?? users[0])?.id ?? user.id);
  }, [user, users]);

  const initialValues: PatientFormValues = useMemo(
    () => ({
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
      hospital_id: defaultHospitalId ? String(defaultHospitalId) : '',
      user_id: defaultUserId,
    }),
    [defaultHospitalId, defaultUserId],
  );

  // resetKey forces PatientForm to reset its internal state every time
  // the dialog opens (and every time the prefill context changes).
  const resetKey = `${open ? 'open' : 'closed'}-${defaultHospitalId ?? 'none'}-${defaultUserId}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline">
            + New Patient
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a patient</DialogTitle>
          <DialogDescription>
            Create a patient without leaving the report creation flow. Only the minimum required
            fields are shown; you can fill in clinical details later from the patient page.
          </DialogDescription>
        </DialogHeader>

        {authLoading ? (
          <p className="text-sm text-muted-foreground">Loading user…</p>
        ) : !user?.id ? (
          <p className="text-sm text-destructive">Authenticated user is unavailable. Please sign in again.</p>
        ) : hospitalsLoading || (isAdmin && usersLoading) ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : hospitals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hospitals available.</p>
        ) : (
          <PatientForm
            mode="quick"
            resetKey={resetKey}
            initialValues={initialValues}
            hospitals={hospitals}
            users={users}
            submitLabel="Create Patient"
            onSubmit={async (payload) => {
              try {
                const res = await createPatient(payload);
                const newId = Number(res?.data?.id);
                // Match the cache key the reports list page uses for its
                // patient dropdown so the new row shows up immediately.
                await mutate(['/patients']);
                toast.success('Patient created.');
                onCreated?.(newId);
                setOpen(false);
              } catch (err) {
                throw new Error(await parseApiError(err, 'Failed to create patient.'));
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
