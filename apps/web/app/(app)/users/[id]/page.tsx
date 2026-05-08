'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import {
  createHospitalSignatory,
  deleteHospitalSignatory,
  deleteHospitalSignatorySignature,
  deleteUser,
  getHospitalSignatories,
  getHospitals,
  getUser,
  updateHospitalSignatory,
  updateUser,
  uploadHospitalSignatorySignature,
} from '@/lib/api';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type UserFormValues = {
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'doctor' | 'staff';
  position_title: string;
  password: string;
};

type SignatoryFormState = {
  name: string;
  position_title: string;
  sip_number: string;
  active: boolean;
};

const resolveAssetUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

const EMPTY_SIGNATORY: SignatoryFormState = {
  name: '',
  position_title: '',
  sip_number: '',
  active: true,
};

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const form = useForm<UserFormValues>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'staff',
      position_title: '',
      password: '',
    },
  });

  const selectedRole = form.watch('role');
  const [hospitalId, setHospitalId] = useState('');
  const [selectedSignatory, setSelectedSignatory] = useState<any>(null);
  const [signatoryForm, setSignatoryForm] = useState<SignatoryFormState>(EMPTY_SIGNATORY);
  const [signatoryMessage, setSignatoryMessage] = useState<string | null>(null);
  const [signatoryError, setSignatoryError] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  const { data: userRes } = useSWR(id ? ['/users', id] : null, () => getUser(id));
  const {
    data: hospitalsRes,
    error: hospitalsError,
  } = useSWR('/hospitals', () => getHospitals());
  const {
    data: signatoriesRes,
    error: signatoriesError,
    mutate: mutateSignatories,
  } = useSWR(
    selectedRole === 'doctor' && hospitalId ? ['/hospitals', hospitalId, 'signatories'] : null,
    () => getHospitalSignatories(hospitalId),
  );

  const hospitals = hospitalsRes?.data ?? [];
  const signatories = signatoriesRes?.data ?? [];
  const userName = userRes?.data?.attributes?.name ?? 'User';

  useEffect(() => {
    if (!userRes?.data) return;
    const attrs = userRes.data.attributes;
    form.reset({
      name: attrs.name ?? '',
      email: attrs.email ?? '',
      phone: attrs.phone ?? '',
      role: attrs.role ?? 'staff',
      position_title: attrs.positionTitle ?? '',
      password: '',
    });
  }, [form, userRes]);

  useEffect(() => {
    if (selectedRole !== 'doctor') {
      setHospitalId('');
      setSelectedSignatory(null);
      setSignatoryForm(EMPTY_SIGNATORY);
      setSignatoryMessage(null);
      setSignatoryError(null);
      setSignatureFile(null);
    }
  }, [selectedRole]);

  useEffect(() => {
    if (selectedRole !== 'doctor' || !hospitalId) {
      setSelectedSignatory(null);
      setSignatoryForm(EMPTY_SIGNATORY);
      return;
    }

    const found = signatories.find(
      (item: any) => Number(item?.attributes?.user_id) === Number(id),
    );

    if (found) {
      setSelectedSignatory(found);
      setSignatoryForm({
        name: found.attributes?.name ?? '',
        position_title: found.attributes?.position_title ?? '',
        sip_number: found.attributes?.sip_number ?? '',
        active: Boolean(found.attributes?.active),
      });
      return;
    }

    setSelectedSignatory(null);
    setSignatoryForm({
      name: form.getValues('name') ?? '',
      position_title: form.getValues('position_title') ?? '',
      sip_number: '',
      active: true,
    } as SignatoryFormState & { user_id: number });
  }, [selectedRole, hospitalId, signatories, id, form]);

  const signatureUrl = useMemo(() => {
    const raw = selectedSignatory?.attributes?.signature_image_url;
    return raw ? resolveAssetUrl(raw) : null;
  }, [selectedSignatory]);

  async function onSubmit(values: UserFormValues) {
    try {
      const payload: Record<string, unknown> = { ...values };
      if (!payload.password) {
        delete payload.password;
      }
      await updateUser(id, payload);
      router.push('/users');
    } catch (error) {
      console.error(error);
      alert('Failed to save user.');
    }
  }

  async function onDeleteUser() {
    try {
      await deleteUser(id);
      router.push('/users');
    } catch (error) {
      console.error(error);
      alert('Failed to delete user.');
    }
  }

  async function handleSaveSignatory() {
    setSignatoryMessage(null);
    setSignatoryError(null);

    if (!hospitalId) {
      setSignatoryError('Please select a hospital first.');
      return;
    }
    if (!signatoryForm.name.trim()) {
      setSignatoryError('Signatory name is required.');
      return;
    }

    try {
      const payload = {
          name: signatoryForm.name.trim(),
        position_title: signatoryForm.position_title,
        sip_number: signatoryForm.sip_number,
        active: signatoryForm.active,
      };

      if (selectedSignatory?.id) {
        await updateHospitalSignatory(selectedSignatory.id, payload);
      } else {
        await createHospitalSignatory(hospitalId, payload);
      }

      await mutateSignatories();
      setSignatoryMessage('Signatory saved successfully.');
    } catch (error) {
      console.error(error);
      setSignatoryError('Failed to save signatory.');
    }
  }

  async function handleDeleteSignatory() {
    if (!selectedSignatory?.id) return;
    const ok = confirm('Delete this signatory?');
    if (!ok) return;

    setSignatoryMessage(null);
    setSignatoryError(null);

    try {
      await deleteHospitalSignatory(selectedSignatory.id);
      await mutateSignatories();
      setSelectedSignatory(null);
      setSignatoryMessage('Signatory deleted successfully.');
    } catch (error) {
      console.error(error);
      setSignatoryError('Failed to delete signatory.');
    }
  }

  async function handleUploadSignature() {
    if (!selectedSignatory?.id || !signatureFile) return;
    setSignatoryMessage(null);
    setSignatoryError(null);

    try {
      await uploadHospitalSignatorySignature(selectedSignatory.id, signatureFile);
      await mutateSignatories();
      setSignatureFile(null);
      setSignatoryMessage('Signature uploaded successfully.');
    } catch (error) {
      console.error(error);
      setSignatoryError('Failed to upload signature.');
    }
  }

  async function handleDeleteSignature() {
    if (!selectedSignatory?.id) return;
    setSignatoryMessage(null);
    setSignatoryError(null);

    try {
      await deleteHospitalSignatorySignature(selectedSignatory.id);
      await mutateSignatories();
      setSignatoryMessage('Signature deleted successfully.');
    } catch (error) {
      console.error(error);
      setSignatoryError('Failed to delete signature.');
    }
  }

  const isDoctorSection = selectedRole === 'doctor';

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Users', href: '/users' },
          { label: userName },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Edit User</CardTitle>
          <Button type="button" variant="destructive" onClick={onDeleteUser}>
            Delete
          </Button>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                rules={{ required: 'Name is required' }}
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
                control={form.control}
                name="email"
                rules={{ required: 'Email is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
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
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">admin</SelectItem>
                        <SelectItem value="doctor">doctor</SelectItem>
                        <SelectItem value="staff">staff</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position_title"
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
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit">Save</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isDoctorSection && (
        <Card>
          <CardHeader>
            <CardTitle>Doctor Signature / Signatory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {signatoryMessage && <p className="text-sm text-emerald-700">{signatoryMessage}</p>}
            {signatoryError && <p className="text-sm text-destructive">{signatoryError}</p>}
            {hospitalsError && (
              <p className="text-sm text-destructive">Unable to load hospitals for signatory setup.</p>
            )}

            <div className="space-y-2">
              <FormLabel>Hospital</FormLabel>
              <Select value={hospitalId} onValueChange={setHospitalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hospital" />
                </SelectTrigger>
                <SelectContent>
                  {!hospitalsError &&
                    hospitals.map((hospital: any) => (
                      <SelectItem key={hospital.id} value={String(hospital.id)}>
                        {hospital.attributes?.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {signatoriesError && (
              <p className="text-sm text-destructive">Unable to load signatories for this hospital.</p>
            )}

            <div className="space-y-2">
              <FormLabel>Name</FormLabel>
              <Input
                value={signatoryForm.name}
                onChange={(event) =>
                  setSignatoryForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <FormLabel>Position title</FormLabel>
              <Input
                value={signatoryForm.position_title}
                onChange={(event) =>
                  setSignatoryForm((prev) => ({ ...prev, position_title: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <FormLabel>SIP number</FormLabel>
              <Input
                value={signatoryForm.sip_number}
                onChange={(event) =>
                  setSignatoryForm((prev) => ({ ...prev, sip_number: event.target.value }))
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={signatoryForm.active}
                onChange={(event) =>
                  setSignatoryForm((prev) => ({ ...prev, active: event.target.checked }))
                }
              />
              Active
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleSaveSignatory}>
                Save Signatory
              </Button>
              {selectedSignatory && (
                <Button type="button" variant="destructive" onClick={handleDeleteSignatory}>
                  Delete Signatory
                </Button>
              )}
            </div>

            {selectedSignatory ? (
              <div className="space-y-2">
                {signatureUrl && (
                  <img
                    src={signatureUrl}
                    alt="Doctor signature"
                    className="max-h-28 w-full object-contain"
                  />
                )}
                <Input
                  type="file"
                  accept="image/png"
                  onChange={(event) => setSignatureFile(event.target.files?.[0] ?? null)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={handleUploadSignature} disabled={!signatureFile}>
                    Upload Signature
                  </Button>
                  {signatureUrl && (
                    <Button type="button" variant="outline" onClick={handleDeleteSignature}>
                      Delete Signature
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Save signatory first before uploading signature.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
