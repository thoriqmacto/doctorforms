'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  deleteReport,
  getHospitals,
  getPatients,
  getReports,
  getTemplates,
  getTests,
  setReportCompletion,
} from '@/lib/api';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/auth-provider';
import {
  buildListQuery,
  loadColumnPrefs,
  parseSort,
  saveColumnPrefs,
  serializeSort,
  type ColumnDef,
  type ColumnPrefs,
  type SortDescriptor,
} from '@/lib/listTable';

const REPORT_COLUMNS: ColumnDef[] = [
  { key: 'title', label: 'Name', defaultVisible: true },
  { key: 'patient', label: 'Patient', defaultVisible: true },
  { key: 'hospital', label: 'Hospital', defaultVisible: true },
  { key: 'owner', label: 'Owner', defaultVisible: true },
  { key: 'operator', label: 'Operator', defaultVisible: false },
  { key: 'template', label: 'Template', defaultVisible: false },
  { key: 'test', label: 'Test', defaultVisible: false },
  { key: 'completion', label: 'Completion', defaultVisible: true },
  { key: 'updated_at', label: 'Last modified', defaultVisible: true },
  { key: 'actions', label: 'Actions', defaultVisible: true },
];

const SORTABLE_COLUMNS = new Set<string>(['title', 'updated_at', 'is_completed']);

const COLUMN_STORAGE_KEY = 'reports-list:columns:v1';
const PAGE_SIZE = 25;

export default function ReportsPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortDescriptor>({ field: 'updated_at', direction: 'desc' });
  const [completionFilter, setCompletionFilter] = useState<'all' | 'completed' | 'open'>('all');

  const [columnPrefs, setColumnPrefs] = useState<ColumnPrefs>(() =>
    loadColumnPrefs(COLUMN_STORAGE_KEY, REPORT_COLUMNS),
  );

  const queryParams = useMemo(
    () =>
      buildListQuery({
        q: search,
        sort,
        page,
        pageSize: PAGE_SIZE,
        extraFilters: {
          is_completed:
            completionFilter === 'completed'
              ? 'true'
              : completionFilter === 'open'
                ? 'false'
                : undefined,
        },
      }),
    [search, sort, page, completionFilter],
  );

  const { data, isLoading, mutate } = useSWR(
    ['/reports', queryParams],
    () => getReports(queryParams),
  );
  const { data: hospitalsData } = useSWR(['/hospitals'], () => getHospitals());
  const { data: templatesData } = useSWR(['/templates'], () => getTemplates());
  const { data: patientsData } = useSWR(['/patients'], () => getPatients());
  const { data: testsData } = useSWR(['/tests'], () => getTests());

  const rows = data?.data ?? [];
  const pageMeta = data?.meta?.pagination ?? data?.meta ?? null;
  const totalRows: number | undefined =
    pageMeta?.total ?? data?.meta?.total ?? data?.total ?? undefined;
  const lastPage: number | undefined =
    pageMeta?.last_page ?? data?.meta?.last_page ?? data?.last_page ?? undefined;

  const hospitals = hospitalsData?.data ?? [];
  const templates = templatesData?.data ?? [];
  const patients = patientsData?.data ?? [];
  const tests = testsData?.data ?? [];

  const hospitalsMap = useMemo(
    () => new Map<string, any>(hospitals.map((item: any) => [String(item.id), item])),
    [hospitals],
  );
  const templatesMap = useMemo(
    () => new Map<string, any>(templates.map((item: any) => [String(item.id), item])),
    [templates],
  );
  const patientsMap = useMemo(
    () => new Map<string, any>(patients.map((item: any) => [String(item.id), item])),
    [patients],
  );
  const testsMap = useMemo(
    () => new Map<string, any>(tests.map((item: any) => [String(item.id), item])),
    [tests],
  );

  const [templateId, setTemplateId] = useState('');
  const [patientId, setPatientId] = useState('');
  const selectedTemplate = useMemo(
    () => templates.find((item: any) => String(item.id) === templateId),
    [templateId, templates],
  );
  const selectedPatient = useMemo(
    () => patients.find((item: any) => String(item.id) === patientId),
    [patientId, patients],
  );
  const derivedHospitalId = selectedTemplate?.relationships?.hospital?.data?.id
    ? String(selectedTemplate.relationships.hospital.data.id)
    : '';
  const derivedTestId = selectedTemplate?.relationships?.test?.data?.id
    ? String(selectedTemplate.relationships.test.data.id)
    : '';
  const selectedHospital = derivedHospitalId ? hospitalsMap.get(derivedHospitalId) : null;
  const selectedTest = derivedTestId ? testsMap.get(derivedTestId) : null;
  const patientDisplayName =
    selectedPatient?.attributes?.name ?? selectedPatient?.attributes?.values?.patient_name ?? '';
  const selectedTemplateDisabled = selectedTemplate?.attributes?.is_enabled === false;
  const templateBlocked = selectedTemplateDisabled && !isAdmin;
  const canCreate =
    Boolean(patientId && templateId && derivedHospitalId && derivedTestId) && !templateBlocked;

  const newReportHref = useMemo(() => {
    if (!canCreate) return '';
    const testCode = (selectedTest?.attributes?.code ?? '').trim();
    const trimmedName = (patientDisplayName ?? '').trim();
    const defaultTitle =
      testCode && trimmedName ? `${testCode} Report - ${trimmedName}` : trimmedName;
    const params = new URLSearchParams({
      patientId,
      templateId,
      hospitalId: derivedHospitalId,
      testId: derivedTestId,
      name: defaultTitle,
      hospitalName: selectedHospital?.attributes?.name ?? '',
      templateName: selectedTemplate?.attributes?.name ?? '',
    });
    if (selectedTest?.attributes?.name) {
      params.set('testName', selectedTest.attributes.name);
    }
    if (testCode) {
      params.set('testCode', testCode);
    }
    return `/reports/new?${params.toString()}`;
  }, [
    canCreate,
    patientId,
    templateId,
    derivedHospitalId,
    derivedTestId,
    patientDisplayName,
    selectedHospital,
    selectedTemplate,
    selectedTest,
  ]);

  async function handleDelete(id: number | string) {
    if (!confirm('Delete this report?')) return;
    await deleteReport(id);
    mutate();
  }

  function handleCreate() {
    if (!canCreate) return;
    router.push(newReportHref);
  }

  async function handleToggleComplete(report: any) {
    const id = report.id;
    const current = !!report.attributes?.is_completed;
    const next = !current;
    if (!current) {
      const percent = report.attributes?.completion_percent;
      if (typeof percent === 'number' && percent < 100) {
        const ok = window.confirm(
          `Only ${percent}% of fields are filled. Mark this report as completed anyway?`,
        );
        if (!ok) return;
      }
    }
    try {
      await setReportCompletion(id, next);
      toast.success(next ? 'Report marked as completed.' : 'Report re-opened.');
      mutate();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update completion status.');
    }
  }

  function toggleSort(field: string) {
    if (!SORTABLE_COLUMNS.has(field)) return;
    setSort((current) => {
      if (current.field !== field) return { field, direction: 'asc' };
      return { field, direction: current.direction === 'asc' ? 'desc' : 'asc' };
    });
    setPage(1);
  }

  function updateColumnPrefs(next: ColumnPrefs) {
    setColumnPrefs(next);
    saveColumnPrefs(COLUMN_STORAGE_KEY, next);
  }

  function toggleColumn(key: string, visible: boolean) {
    updateColumnPrefs({
      ...columnPrefs,
      visible: { ...columnPrefs.visible, [key]: visible },
    });
  }

  function moveColumn(key: string, direction: -1 | 1) {
    const order = [...columnPrefs.order];
    const idx = order.indexOf(key);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= order.length) return;
    [order[idx], order[target]] = [order[target], order[idx]];
    updateColumnPrefs({ ...columnPrefs, order });
  }

  const visibleColumns = columnPrefs.order
    .map((key) => REPORT_COLUMNS.find((c) => c.key === key))
    .filter((c): c is ColumnDef => !!c && columnPrefs.visible[c.key] !== false);

  function renderHeaderCell(col: ColumnDef) {
    if (!SORTABLE_COLUMNS.has(col.key)) {
      return <TableHead key={col.key}>{col.label}</TableHead>;
    }
    const arrow =
      sort.field === col.key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : '';
    return (
      <TableHead key={col.key}>
        <button
          type="button"
          className="text-left font-medium hover:underline"
          onClick={() => toggleSort(col.key)}
          aria-label={`Sort by ${col.label}`}
        >
          {col.label}
          {arrow}
        </button>
      </TableHead>
    );
  }

  function renderCell(col: ColumnDef, report: any) {
    const a = report.attributes ?? {};
    const rels = report.relationships ?? {};
    const patient = rels?.patient?.data?.id ? patientsMap.get(String(rels.patient.data.id)) : null;
    const hospital = rels?.hospital?.data?.id ? hospitalsMap.get(String(rels.hospital.data.id)) : null;
    const template = rels?.template?.data?.id ? templatesMap.get(String(rels.template.data.id)) : null;
    const test = rels?.test?.data?.id ? testsMap.get(String(rels.test.data.id)) : null;

    switch (col.key) {
      case 'title':
        return <TableCell key={col.key}>{a.title ?? `Report #${report.id}`}</TableCell>;
      case 'patient':
        return (
          <TableCell key={col.key}>
            {patient?.attributes?.name ?? '-'}
          </TableCell>
        );
      case 'hospital':
        return <TableCell key={col.key}>{hospital?.attributes?.name ?? '-'}</TableCell>;
      case 'owner': {
        const ownerName = rels?.user?.data?.attributes?.name;
        return <TableCell key={col.key}>{ownerName ?? 'Unassigned'}</TableCell>;
      }
      case 'operator':
        return <TableCell key={col.key}>{a.operator ?? '-'}</TableCell>;
      case 'template':
        return <TableCell key={col.key}>{template?.attributes?.name ?? '-'}</TableCell>;
      case 'test':
        return <TableCell key={col.key}>{test?.attributes?.name ?? test?.attributes?.code ?? '-'}</TableCell>;
      case 'completion': {
        const percent: number | null = a.completion_percent ?? null;
        const done = !!a.is_completed;
        return (
          <TableCell key={col.key}>
            <div className="flex items-center gap-2">
              {done ? (
                <Badge variant="secondary">Completed</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {typeof percent === 'number' ? `${percent}%` : '—'}
                </span>
              )}
              <Button
                type="button"
                variant={done ? 'outline' : 'secondary'}
                size="sm"
                onClick={() => handleToggleComplete(report)}
              >
                {done ? 'Re-open' : 'Mark complete'}
              </Button>
            </div>
          </TableCell>
        );
      }
      case 'updated_at': {
        const ts = a.updated_at as string | undefined;
        return <TableCell key={col.key}>{ts ? new Date(ts).toLocaleString() : '-'}</TableCell>;
      }
      case 'actions':
        return (
          <TableCell key={col.key} className="space-x-2 text-right">
            {a.pdf_url && (
              <Link href={a.pdf_url} target="_blank">
                <Button variant="secondary" size="sm">PDF</Button>
              </Link>
            )}
            <Link href={`/reports/${report.id}`}>
              <Button size="sm" variant="secondary">View</Button>
            </Link>
            <Link href={`/reports/${report.id}/edit`}>
              <Button size="sm" variant="secondary">Edit</Button>
            </Link>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(report.id)}>
              Delete
            </Button>
          </TableCell>
        );
      default:
        return <TableCell key={col.key}>—</TableCell>;
    }
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reports' }]} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reports</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient: any) => {
                  const pName =
                    patient.attributes?.name ?? patient.attributes?.values?.patient_name ?? `Patient #${patient.id}`;
                  const identifier = patient.attributes?.mrn ?? patient.attributes?.identifier;
                  return (
                    <SelectItem key={patient.id} value={String(patient.id)}>
                      {identifier ? `${pName} (${identifier})` : pName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates
                  .filter((template: any) => {
                    if (template.attributes?.is_enabled === false && !isAdmin) {
                      return false;
                    }
                    return true;
                  })
                  .map((template: any) => {
                    const disabled = template.attributes?.is_enabled === false;
                    const baseName = template.attributes?.name ?? `Template #${template.id}`;
                    return (
                      <SelectItem key={template.id} value={String(template.id)}>
                        {disabled ? `${baseName} (Disabled)` : baseName}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>

            <Button onClick={handleCreate} disabled={!canCreate}>
              Create Report
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {templateBlocked && (
            <p className="text-sm text-destructive">
              Selected template is disabled. Ask an administrator to enable it before creating a new report.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search title, patient, hospital, operator…"
              className="max-w-sm"
            />
            <Select
              value={completionFilter}
              onValueChange={(v) => {
                setCompletionFilter(v as 'all' | 'completed' | 'open');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={serializeSort(sort)}
              onValueChange={(v) => {
                setSort(parseSort(v, 'updated_at'));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-updated_at">Last modified (newest)</SelectItem>
                <SelectItem value="updated_at">Last modified (oldest)</SelectItem>
                <SelectItem value="title">Title (A→Z)</SelectItem>
                <SelectItem value="-title">Title (Z→A)</SelectItem>
                <SelectItem value="-is_completed">Status (completed first)</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">Columns</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columnPrefs.order.map((key, idx) => {
                  const col = REPORT_COLUMNS.find((c) => c.key === key);
                  if (!col) return null;
                  return (
                    <div key={key} className="flex items-center justify-between px-2 py-1 text-sm">
                      <DropdownMenuCheckboxItem
                        checked={columnPrefs.visible[key] !== false}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={(checked) => toggleColumn(key, checked === true)}
                        className="flex-1"
                      >
                        {col.label}
                      </DropdownMenuCheckboxItem>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Move ${col.label} up`}
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.preventDefault();
                            moveColumn(key, -1);
                          }}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Move ${col.label} down`}
                          disabled={idx === columnPrefs.order.length - 1}
                          onClick={(e) => {
                            e.preventDefault();
                            moveColumn(key, 1);
                          }}
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isLoading ? (
            'Loading…'
          ) : (
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-b">
                  {visibleColumns.map((col) => renderHeaderCell(col))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length} className="text-center text-sm text-muted-foreground">
                      No reports match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((report: any) => (
                    <TableRow key={report.id} className="border-b hover:bg-muted/30">
                      {visibleColumns.map((col) => renderCell(col, report))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>
              {typeof totalRows === 'number'
                ? `${totalRows} total · Page ${page}${lastPage ? ` of ${lastPage}` : ''}`
                : `Page ${page}`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => (lastPage ? Math.min(lastPage, p + 1) : p + 1))}
                disabled={!!lastPage && page >= lastPage}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
