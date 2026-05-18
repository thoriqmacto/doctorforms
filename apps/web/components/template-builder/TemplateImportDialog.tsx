'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getHospitals, getTests, getUsers, importTemplate } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { TemplateExportV1Schema, type TemplateExportV1 } from '@/lib/template-renderer/schema';

const SELECT_CLASS =
  'border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

type Option = { id: number; name: string };

function toOptions(raw: any[] | undefined, labelKey: string = 'name'): Option[] {
  return (raw ?? [])
    .map((row: any) => ({
      id: Number(row?.id),
      name: typeof row?.attributes?.[labelKey] === 'string' ? row.attributes[labelKey] : `#${row?.id}`,
    }))
    .filter((o) => Number.isFinite(o.id) && o.id > 0);
}

export default function TemplateImportDialog({
  trigger,
  onImported,
}: {
  trigger?: React.ReactNode;
  onImported?: (newTemplateId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<TemplateExportV1 | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [filename, setFilename] = useState<string>('');

  const [hospitalId, setHospitalId] = useState<string>('');
  const [testId, setTestId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: hospitalsRes } = useSWR(open ? ['/hospitals', 'import-dialog'] : null, () => getHospitals());
  const { data: testsRes } = useSWR(open ? ['/tests', 'import-dialog'] : null, () => getTests());
  const { data: usersRes } = useSWR(open && isAdmin ? ['/users', 'import-dialog'] : null, () => getUsers());

  const hospitals = toOptions(hospitalsRes?.data);
  const tests = toOptions(testsRes?.data, 'code');
  const users = toOptions(usersRes?.data);

  function resetState() {
    setParsed(null);
    setErrors([]);
    setHospitalId('');
    setTestId('');
    setUserId('');
    setFilename('');
  }

  async function handleFile(file: File) {
    setErrors([]);
    setParsed(null);
    setFilename(file.name);

    let raw: unknown;
    try {
      const text = await file.text();
      raw = JSON.parse(text);
    } catch {
      setErrors(['Could not parse file as JSON. Make sure you selected a valid .json export.']);
      return;
    }

    const result = TemplateExportV1Schema.safeParse(raw);
    if (!result.success) {
      setErrors(
        result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
      );
      return;
    }

    setParsed(result.data);
    const t = result.data.template;
    setHospitalId(String(t.hospital_id ?? ''));
    setTestId(String(t.test_id ?? ''));
    setUserId(String(t.user_id ?? ''));
  }

  async function handleSubmit() {
    if (!parsed) return;
    setSubmitting(true);
    setErrors([]);

    const overriddenHospitalId = Number(hospitalId);
    const overriddenTestId = Number(testId);
    const overriddenUserId = Number(userId);

    if (!Number.isFinite(overriddenHospitalId) || overriddenHospitalId <= 0) {
      setErrors(['Choose a target hospital.']);
      setSubmitting(false);
      return;
    }
    if (!Number.isFinite(overriddenTestId) || overriddenTestId <= 0) {
      setErrors(['Choose a target test.']);
      setSubmitting(false);
      return;
    }
    if (!Number.isFinite(overriddenUserId) || overriddenUserId <= 0) {
      setErrors(['Choose an owning user.']);
      setSubmitting(false);
      return;
    }

    const payload: TemplateExportV1 = {
      ...parsed,
      template: {
        ...parsed.template,
        hospital_id: overriddenHospitalId,
        test_id: overriddenTestId,
        user_id: overriddenUserId,
      },
    };

    try {
      const created = await importTemplate(payload as unknown as Record<string, unknown>);
      const newId = Number(created?.data?.id);
      toast.success('Template imported. Enable it from the templates list once you have reviewed it.');
      onImported?.(newId);
      setOpen(false);
      resetState();
    } catch (err: any) {
      try {
        const body = await err?.response?.clone?.().json?.();
        const flat = body?.errors
          ? Object.entries(body.errors as Record<string, unknown>)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
          : [];
        setErrors(flat.length > 0 ? flat : [body?.message ?? 'Import failed.']);
      } catch {
        setErrors(['Import failed.']);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetState();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">Import Template</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import template from JSON</DialogTitle>
          <DialogDescription>
            Pick a TemplateExportV1 JSON file. The imported template is created as Disabled — an
            administrator must publish it before doctors can use it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="template-import-file">JSON file</Label>
            <Input
              id="template-import-file"
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            {filename ? <p className="text-xs text-muted-foreground">Selected: {filename}</p> : null}
          </div>

          {parsed ? (
            <div className="space-y-3 rounded-md border p-3">
              <div className="text-sm">
                <span className="font-medium">{parsed.template.name}</span>{' '}
                <span className="text-muted-foreground">
                  · {parsed.fields.length} field{parsed.fields.length === 1 ? '' : 's'}
                </span>
              </div>
              {parsed.template.description ? (
                <Textarea
                  readOnly
                  value={parsed.template.description}
                  className="bg-muted/30 text-xs"
                  rows={3}
                />
              ) : null}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Hospital</Label>
                  <select
                    className={SELECT_CLASS}
                    value={hospitalId}
                    onChange={(e) => setHospitalId(e.target.value)}
                  >
                    <option value="">Select hospital</option>
                    {hospitals.map((h) => (
                      <option key={h.id} value={String(h.id)}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Test</Label>
                  <select
                    className={SELECT_CLASS}
                    value={testId}
                    onChange={(e) => setTestId(e.target.value)}
                  >
                    <option value="">Select test</option>
                    {tests.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Owner</Label>
                  {isAdmin ? (
                    <select
                      className={SELECT_CLASS}
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                    >
                      <option value="">Select user</option>
                      {users.map((u) => (
                        <option key={u.id} value={String(u.id)}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input readOnly value={user?.name ?? `User #${user?.id ?? ''}`} />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The JSON file&apos;s foreign keys are prefilled above. Adjust them if you are importing across environments.
              </p>
            </div>
          ) : null}

          {errors.length > 0 ? (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-xs text-destructive">
              <ul className="list-inside list-disc space-y-1">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!parsed || submitting}>
            {submitting ? 'Importing…' : 'Import template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
