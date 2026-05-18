'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { importPatientsCsv, type PatientImportSummary } from '@/lib/api';

/**
 * CSV upload dialog for patients. Calls the backend importer (which
 * upserts by mrn+hospital_id and continues on per-row failure), then
 * renders the summary alongside a per-row error table the user can
 * scroll through.
 */
export default function ImportPatientsCsvDialog({
  trigger,
  onImported,
}: {
  trigger?: React.ReactNode;
  onImported?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<PatientImportSummary['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { mutate } = useSWRConfig();

  function reset() {
    setFile(null);
    setSummary(null);
    setError(null);
  }

  async function handleSubmit() {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    setSummary(null);
    try {
      const res = await importPatientsCsv(file);
      setSummary(res.data);
      toast.success(
        `Import done: ${res.data.succeeded}/${res.data.total} rows ` +
          `(${res.data.created} created, ${res.data.updated} updated, ${res.data.failed} failed).`,
      );
      // Invalidate every patients-keyed SWR entry so list pages and the
      // report-creation dropdown refresh.
      await mutate(
        (key) => Array.isArray(key) && key[0] === '/patients',
        undefined,
        { revalidate: true },
      );
      onImported?.();
    } catch (err: any) {
      try {
        const body = await err?.response?.clone?.().json?.();
        setError(body?.message ?? 'Import failed.');
      } catch {
        setError('Import failed.');
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
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger ?? <Button variant="outline">Import CSV</Button>}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import patients from CSV</DialogTitle>
          <DialogDescription>
            Required columns: <code>mrn</code>, <code>name</code>, <code>gender</code>,{' '}
            <code>hospital_id</code>, <code>user_id</code>. Optional: <code>dob</code>,{' '}
            <code>dos</code>, <code>age</code>, <code>height_cm</code>, <code>weight_kg</code>,{' '}
            <code>bsa</code>, <code>blood_pressure</code>, <code>diagnosis_brief</code>,{' '}
            <code>referring_physician</code>. Rows are upserted by (mrn + hospital_id); one bad row
            does not stop the file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="patients-csv-file">CSV file</Label>
            <Input
              id="patients-csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setSummary(null);
                setError(null);
              }}
            />
            {file ? <p className="text-xs text-muted-foreground">Selected: {file.name}</p> : null}
          </div>

          {error ? (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {summary ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <div className="rounded-md border p-2 text-center">
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="text-lg font-semibold">{summary.total}</div>
                </div>
                <div className="rounded-md border p-2 text-center">
                  <div className="text-xs text-muted-foreground">Succeeded</div>
                  <div className="text-lg font-semibold text-emerald-600">{summary.succeeded}</div>
                </div>
                <div className="rounded-md border p-2 text-center">
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div className="text-lg font-semibold">{summary.created}</div>
                </div>
                <div className="rounded-md border p-2 text-center">
                  <div className="text-xs text-muted-foreground">Updated</div>
                  <div className="text-lg font-semibold">{summary.updated}</div>
                </div>
                <div className="rounded-md border p-2 text-center">
                  <div className="text-xs text-muted-foreground">Failed</div>
                  <div className="text-lg font-semibold text-destructive">{summary.failed}</div>
                </div>
              </div>
              {summary.results.length > 0 ? (
                <div className="max-h-72 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.results.map((r) => (
                        <TableRow key={r.row}>
                          <TableCell>{r.row}</TableCell>
                          <TableCell>
                            {r.status === 'success' ? (
                              <Badge variant="secondary">{r.action ?? 'success'}</Badge>
                            ) : (
                              <Badge variant="destructive">failed</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.status === 'success' ? (
                              <span className="text-muted-foreground">
                                Patient #{r.patient_id}
                              </span>
                            ) : r.errors ? (
                              <ul className="list-inside list-disc space-y-0.5">
                                {Object.entries(r.errors).map(([field, msgs]) => (
                                  <li key={field}>
                                    <span className="font-medium">{field}:</span>{' '}
                                    {(msgs ?? []).join(' ')}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-destructive">Unknown error.</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Close
          </Button>
          <Button onClick={handleSubmit} disabled={!file || submitting}>
            {submitting ? 'Importing…' : 'Import CSV'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
