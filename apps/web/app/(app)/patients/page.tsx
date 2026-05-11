'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
    deletePatient,
    getHospitals,
    getPatients,
    getReports,
    getUsers,
} from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Breadcrumbs from '@/components/Breadcrumbs';
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

const PATIENT_COLUMNS: ColumnDef[] = [
    { key: 'name', label: 'Name', defaultVisible: true },
    { key: 'mrn', label: 'MRN', defaultVisible: false },
    { key: 'gender_age', label: 'Gender / Age', defaultVisible: false },
    { key: 'hospital', label: 'Hospital', defaultVisible: true },
    { key: 'user', label: 'User', defaultVisible: true },
    { key: 'reports', label: 'Reports', defaultVisible: false },
    { key: 'updated_at', label: 'Last modified', defaultVisible: true },
    { key: 'actions', label: 'Actions', defaultVisible: true },
];

const SORTABLE_COLUMNS = new Set<string>(['name', 'mrn', 'updated_at']);
const COLUMN_STORAGE_KEY = 'patients-list:columns:v1';
const PAGE_SIZE = 25;

export default function PatientsPage() {
    const { user: authUser } = useAuth();
    const isAdmin = authUser?.role === 'admin';

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState<SortDescriptor>({ field: 'updated_at', direction: 'desc' });

    const [columnPrefs, setColumnPrefs] = useState<ColumnPrefs>(() =>
        loadColumnPrefs(COLUMN_STORAGE_KEY, PATIENT_COLUMNS),
    );

    const queryParams = useMemo(
        () =>
            buildListQuery({
                q: search,
                sort,
                page,
                pageSize: PAGE_SIZE,
            }),
        [search, sort, page],
    );

    const { data, isLoading, mutate } = useSWR(
        ['/patients', queryParams],
        () => getPatients(queryParams),
    );
    const { data: hospitalsData } = useSWR(['/hospitals'], () => getHospitals());
    const { data: reportsData } = useSWR(['/reports'], () => getReports());
    const { data: usersData } = useSWR(isAdmin ? ['/users'] : null, () => getUsers());

    const rows = data?.data ?? [];
    const pageMeta = data?.meta?.pagination ?? data?.meta ?? null;
    const totalRows: number | undefined =
        pageMeta?.total ?? data?.meta?.total ?? data?.total ?? undefined;
    const lastPage: number | undefined =
        pageMeta?.last_page ?? data?.meta?.last_page ?? data?.last_page ?? undefined;

    const hospitals = hospitalsData?.data ?? [];
    const reports = reportsData?.data ?? [];
    const users = usersData?.data ?? [];

    const hospitalsMap = useMemo(
        () => new Map<string, any>(hospitals.map((h: any) => [String(h.id), h])),
        [hospitals],
    );
    const usersMap = useMemo(
        () => new Map<string, any>(users.map((u: any) => [String(u.id), u])),
        [users],
    );

    const reportsByPatient = useMemo(() => {
        const map = new Map<string, any[]>();
        reports.forEach((r: any) => {
            const pid = r.relationships?.patient?.data?.id;
            if (!pid) return;
            const list = map.get(String(pid)) ?? [];
            list.push(r);
            map.set(String(pid), list);
        });
        return map;
    }, [reports]);

    async function handleDelete(id: number | string) {
        if (!confirm('Delete this patient?')) return;
        await deletePatient(id);
        mutate();
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
        updateColumnPrefs({ ...columnPrefs, visible: { ...columnPrefs.visible, [key]: visible } });
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
        .map((key) => PATIENT_COLUMNS.find((c) => c.key === key))
        .filter((c): c is ColumnDef => !!c && columnPrefs.visible[c.key] !== false);

    function renderHeaderCell(col: ColumnDef) {
        if (!SORTABLE_COLUMNS.has(col.key)) {
            return <TableHead key={col.key}>{col.label}</TableHead>;
        }
        const arrow = sort.field === col.key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : '';
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

    function renderCell(col: ColumnDef, p: any) {
        const a = p.attributes ?? {};
        const rels = p.relationships ?? {};
        const hospitalId = rels?.hospital?.data?.id;
        const hospital = hospitalId ? hospitalsMap.get(String(hospitalId)) : undefined;
        const userId = rels?.user?.data?.id;
        const userRow = userId ? usersMap.get(String(userId)) : undefined;
        const patientReports = reportsByPatient.get(String(p.id)) ?? [];

        switch (col.key) {
            case 'name':
                return <TableCell key={col.key}>{a.name ?? '-'}</TableCell>;
            case 'mrn':
                return <TableCell key={col.key}>{a.mrn ?? '-'}</TableCell>;
            case 'gender_age':
                return (
                    <TableCell key={col.key}>
                        {(a.gender ?? '-') + ' / ' + (a.age ?? '-')}
                    </TableCell>
                );
            case 'hospital':
                return <TableCell key={col.key}>{hospital?.attributes?.name ?? '-'}</TableCell>;
            case 'user':
                return (
                    <TableCell key={col.key}>
                        {userRow?.attributes?.name ?? (userId ? `User #${userId}` : '-')}
                    </TableCell>
                );
            case 'reports':
                return (
                    <TableCell key={col.key}>
                        {patientReports.length > 0 ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="secondary" size="sm">
                                        {patientReports.length} report{patientReports.length === 1 ? '' : 's'}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {patientReports.map((r: any) => (
                                        <DropdownMenuItem key={r.id} asChild>
                                            <Link href={`/reports/${r.id}`}>
                                                {r.attributes?.title ?? `Report ${r.id}`}
                                            </Link>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            '-'
                        )}
                    </TableCell>
                );
            case 'updated_at': {
                const ts = a.updated_at as string | undefined;
                return <TableCell key={col.key}>{ts ? new Date(ts).toLocaleString() : '-'}</TableCell>;
            }
            case 'actions':
                return (
                    <TableCell key={col.key} className="space-x-2 text-right">
                        <Link href={`/patients/${p.id}`}>
                            <Button size="sm" variant="secondary">Edit</Button>
                        </Link>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(p.id)}
                        >
                            Delete
                        </Button>
                    </TableCell>
                );
            default:
                return <TableCell key={col.key}>—</TableCell>;
        }
    }

    return (
        <div className="container mx-auto p-4 space-y-4">
            <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Patients' }]} />
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Patients</h1>
                <Link href="/patients/new">
                    <Button>Add Patient</Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Patients</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Search name, MRN, hospital, user…"
                            className="max-w-sm"
                        />
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
                                <SelectItem value="name">Name (A→Z)</SelectItem>
                                <SelectItem value="-name">Name (Z→A)</SelectItem>
                                <SelectItem value="mrn">MRN</SelectItem>
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
                                    const col = PATIENT_COLUMNS.find((c) => c.key === key);
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
                                            No patients match the current filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((p: any) => (
                                        <TableRow key={p.id} className="border-b hover:bg-muted/30">
                                            {visibleColumns.map((col) => renderCell(col, p))}
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
