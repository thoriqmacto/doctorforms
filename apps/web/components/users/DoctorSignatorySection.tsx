'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  createHospitalSignatory,
  deleteHospitalSignatory,
  deleteHospitalSignatorySignature,
  getHospitalSignatories,
  getHospitals,
  updateHospitalSignatory,
  uploadHospitalSignatorySignature,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SELECT_CLASS =
  'border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

function getApiOrigin(): string | null {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) return null;
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

function resolveAssetUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  try {
    if (/^https?:\/\//i.test(url)) return url;
    const origin = getApiOrigin();
    if (url.startsWith('/storage') || url.startsWith('/api')) {
      return origin ? `${origin}${url}` : url;
    }
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!base) return url;
    try {
      return new URL(url, base.endsWith('/') ? base : `${base}/`).toString();
    } catch {
      return url;
    }
  } catch {
    return url ?? null;
  }
}

const parseErr = async (err: any, fallback: string) => {
  if (err?.response?.status === 403) {
    return 'You do not have permission to manage signatories.';
  }
  if (!err?.response) return fallback;
  try {
    const r = await err.response.json();
    const msg = Object.values(r?.errors ?? {}).flat().join(' ');
    return msg || fallback;
  } catch {
    return fallback;
  }
};

type Hospital = { id: number; name: string };

export default function DoctorSignatorySection({
  userId,
  userName,
  positionTitle,
}: {
  userId: string;
  userName: string;
  positionTitle: string;
}) {
  const [hospitalId, setHospitalId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: userName ?? '',
    position_title: positionTitle ?? '',
    sip_number: '',
    active: true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [signatureLoadFailed, setSignatureLoadFailed] = useState(false);

  const userIdNumber = Number(userId);
  const userIdValid = Number.isFinite(userIdNumber) && userIdNumber > 0;

  const { data: hRes, error: hErr, isLoading: hLoad } = useSWR('/hospitals', () => getHospitals());
  const { data: sRes, error: sErr, mutate, isLoading: signatoryLoading } = useSWR(
    hospitalId && userIdValid ? ['hospital-signatories', hospitalId, userId] : null,
    () => getHospitalSignatories(hospitalId),
  );

  const hospitalsPermissionDenied = (hErr as any)?.response?.status === 403;
  const signatoriesPermissionDenied = (sErr as any)?.response?.status === 403;

  const validHospitals: Hospital[] = useMemo(() => {
    const hospitalsRaw = Array.isArray(hRes?.data) ? hRes!.data : [];
    return hospitalsRaw
      .map((h: any) => {
        const id = Number(h?.id);
        const rawName = h?.attributes?.name;
        const name =
          typeof rawName === 'string' && rawName.trim().length > 0
            ? rawName
            : `Hospital ${Number.isFinite(id) ? id : ''}`;
        return { id, name };
      })
      .filter(
        (h: Hospital) =>
          Number.isFinite(h.id) && h.id > 0 && typeof h.name === 'string' && h.name.trim().length > 0,
      );
  }, [hRes]);

  const signatoriesRaw = useMemo(
    () => (Array.isArray(sRes?.data) ? sRes!.data : []),
    [sRes],
  );

  const selected = useMemo(() => {
    if (!userIdValid) return null;
    try {
      return (
        signatoriesRaw.find((i: any) => {
          const sigUserId = Number(i?.attributes?.user_id);
          return Number.isFinite(sigUserId) && sigUserId === userIdNumber;
        }) ?? null
      );
    } catch {
      return null;
    }
  }, [signatoriesRaw, userIdNumber, userIdValid]);

  useEffect(() => {
    if (selected) {
      const a = selected.attributes ?? {};
      setForm({
        name: typeof a.name === 'string' ? a.name : '',
        position_title: typeof a.position_title === 'string' ? a.position_title : '',
        sip_number: typeof a.sip_number === 'string' ? a.sip_number : '',
        active: Boolean(a.active),
      });
    } else {
      setForm({
        name: userName ?? '',
        position_title: positionTitle ?? '',
        sip_number: '',
        active: true,
      });
    }
    setSignatureLoadFailed(false);
  }, [selected, userName, positionTitle]);

  const signatureUrl = useMemo(() => {
    try {
      return resolveAssetUrl(selected?.attributes?.signature_image_url);
    } catch {
      return null;
    }
  }, [selected]);

  const hasHospitals = validHospitals.length > 0;
  const saveDisabled = !userIdValid || !hasHospitals;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Doctor Signature / Signatory</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        {!userIdValid && <p className='text-sm text-destructive'>Invalid doctor user id.</p>}
        {msg && <p className='text-sm text-emerald-700'>{msg}</p>}
        {err && <p className='text-sm text-destructive'>{err}</p>}
        {hLoad && <p className='text-sm text-muted-foreground'>Loading hospitals...</p>}
        {hospitalsPermissionDenied && (
          <p className='text-sm text-destructive'>You do not have permission to manage signatories.</p>
        )}
        {hErr && !hospitalsPermissionDenied && (
          <p className='text-sm text-destructive'>Unable to load hospitals for signatory setup.</p>
        )}
        {!hLoad && !hErr && !hasHospitals && (
          <p className='text-sm text-muted-foreground'>No hospitals available.</p>
        )}

        <div className='space-y-2'>
          <Label>Hospital</Label>
          <select
            className={SELECT_CLASS}
            value={hospitalId}
            onChange={(event) => {
              setErr(null);
              setMsg(null);
              setHospitalId(event.target.value);
            }}
            disabled={hLoad || !hasHospitals || !userIdValid}
          >
            <option value=''>Select hospital</option>
            {validHospitals.map((h) => (
              <option key={h.id} value={String(h.id)}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        {hospitalId && signatoryLoading && (
          <p className='text-sm text-muted-foreground'>Loading signatories...</p>
        )}
        {hospitalId && signatoriesPermissionDenied && (
          <p className='text-sm text-destructive'>You do not have permission to manage signatories.</p>
        )}
        {hospitalId && sErr && !signatoriesPermissionDenied && (
          <p className='text-sm text-destructive'>Unable to load signatories for this hospital.</p>
        )}

        <Input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder='Name'
        />
        <Input
          value={form.position_title}
          onChange={(e) => setForm((p) => ({ ...p, position_title: e.target.value }))}
          placeholder='Position title'
        />
        <Input
          value={form.sip_number}
          onChange={(e) => setForm((p) => ({ ...p, sip_number: e.target.value }))}
          placeholder='SIP number'
        />
        <label className='flex gap-2 text-sm'>
          <input
            type='checkbox'
            checked={form.active}
            onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
          />
          Active
        </label>

        <div className='flex gap-2'>
          <Button
            type='button'
            disabled={saveDisabled}
            onClick={async () => {
              setErr(null);
              setMsg(null);
              if (!userIdValid) return setErr('Invalid doctor user id.');
              if (!hospitalId) return setErr('Please select a hospital first.');
              if (!form.name.trim()) return setErr('Signatory name is required.');
              const payload = {
                user_id: userIdNumber,
                name: form.name.trim(),
                position_title: form.position_title,
                sip_number: form.sip_number,
                active: form.active,
              };
              try {
                if (selected?.id) {
                  await updateHospitalSignatory(selected.id, payload);
                } else {
                  await createHospitalSignatory(hospitalId, payload);
                }
                await mutate();
                setMsg('Signatory saved successfully.');
              } catch (e: any) {
                setErr(await parseErr(e, 'Failed to save signatory.'));
                if (e?.response?.status === 422) {
                  try {
                    await mutate();
                  } catch {
                    /* ignore */
                  }
                }
              }
            }}
          >
            Save Signatory
          </Button>
          {selected && (
            <Button
              type='button'
              variant='destructive'
              onClick={async () => {
                if (!confirm('Delete this signatory?')) return;
                setErr(null);
                setMsg(null);
                try {
                  await deleteHospitalSignatory(selected.id);
                  await mutate();
                  setMsg('Signatory deleted successfully.');
                } catch (e: any) {
                  setErr(await parseErr(e, 'Failed to delete signatory.'));
                }
              }}
            >
              Delete Signatory
            </Button>
          )}
        </div>

        {selected ? (
          <div className='space-y-2'>
            {signatureUrl && !signatureLoadFailed && (
              <img
                src={signatureUrl}
                alt='Doctor signature'
                className='max-h-28 w-full object-contain'
                onError={() => setSignatureLoadFailed(true)}
              />
            )}
            {signatureLoadFailed && (
              <p className='text-sm text-destructive'>Signature image could not be loaded.</p>
            )}
            <Input
              type='file'
              accept='image/png'
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className='flex gap-2'>
              <Button
                type='button'
                disabled={!file}
                onClick={async () => {
                  if (!file) return;
                  setErr(null);
                  setMsg(null);
                  const isPng =
                    file.type === 'image/png' ||
                    (file.type === '' && file.name.toLowerCase().endsWith('.png'));
                  if (!isPng) return setErr('Only PNG signature files are allowed.');
                  try {
                    await uploadHospitalSignatorySignature(selected.id, file);
                    await mutate();
                    setFile(null);
                    setSignatureLoadFailed(false);
                    setMsg('Signature uploaded successfully.');
                  } catch (e: any) {
                    setErr(await parseErr(e, 'Failed to upload signature.'));
                  }
                }}
              >
                Upload Signature
              </Button>
              {signatureUrl && (
                <Button
                  type='button'
                  variant='outline'
                  onClick={async () => {
                    if (!confirm('Delete this signature?')) return;
                    setErr(null);
                    setMsg(null);
                    try {
                      await deleteHospitalSignatorySignature(selected.id);
                      await mutate();
                      setSignatureLoadFailed(false);
                      setMsg('Signature deleted successfully.');
                    } catch (e: any) {
                      setErr(await parseErr(e, 'Failed to delete signature.'));
                    }
                  }}
                >
                  Delete Signature
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className='text-sm text-muted-foreground'>
            Save signatory first before uploading signature.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
