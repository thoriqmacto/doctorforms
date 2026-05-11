'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { deleteReport, getHospitals, getPatients, getReports, getTemplates, getTests } from '@/lib/api';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/components/auth-provider';

export default function ReportsPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';
  const { data, isLoading, mutate } = useSWR(['/reports'], () => getReports().then((r: any) => r));
  const { data: hospitalsData } = useSWR(['/hospitals'], () => getHospitals().then((r: any) => r));
  const { data: templatesData } = useSWR(['/templates'], () => getTemplates().then((r: any) => r));
  const { data: patientsData } = useSWR(['/patients'], () => getPatients().then((r: any) => r));
  const { data: testsData } = useSWR(['/tests'], () => getTests().then((r: any) => r));

  const [templateId, setTemplateId] = useState('');
  const [patientId, setPatientId] = useState('');

  const rows = data?.data ?? [];
  const hospitals = hospitalsData?.data ?? [];
  const templates = templatesData?.data ?? [];
  const patients = patientsData?.data ?? [];
  const tests = testsData?.data ?? [];

  const hospitalsMap = new Map<string, any>(hospitals.map((item: any) => [String(item.id), item]));
  const templatesMap = new Map<string, any>(templates.map((item: any) => [String(item.id), item]));
  const patientsMap = new Map<string, any>(patients.map((item: any) => [String(item.id), item]));
  const testsMap = new Map<string, any>(tests.map((item: any) => [String(item.id), item]));

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

  const selectedTemplateDisabled =
    selectedTemplate?.attributes?.is_enabled === false;
  const templateBlocked = selectedTemplateDisabled && !isAdmin;
  const canCreate =
    Boolean(patientId && templateId && derivedHospitalId && derivedTestId) &&
    !templateBlocked;

  const newReportHref = useMemo(() => {
    if (!canCreate) return '';
    // Default title format requested by spec: "[test.code] Report - [patient.name]"
    // e.g. "TTE Report - Suhaicih Orin". Falls back to patient name when
    // the code or the patient name is missing.
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
  }, [canCreate, patientId, templateId, derivedHospitalId, derivedTestId, patientDisplayName, selectedHospital, selectedTemplate, selectedTest]);

  async function handleDelete(id: number | string) {
    if (!confirm('Delete this report?')) return;
    await deleteReport(id);
    mutate();
  }

  function handleCreate() {
    if (!canCreate) return;
    router.push(newReportHref);
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
                  const pName = patient.attributes?.name ?? patient.attributes?.values?.patient_name ?? `Patient #${patient.id}`;
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
                    // Backend already hides disabled templates from non-admin
                    // users, but the cached SWR list could be stale. Filter
                    // defensively.
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
          {templateId && !derivedHospitalId && (
            <p className="text-sm text-destructive">Selected template is missing hospital relationship.</p>
          )}
          {templateId && !derivedTestId && (
            <p className="text-sm text-destructive">Selected template is missing test relationship.</p>
          )}
          {templateId && derivedHospitalId && (
            <p className="text-sm text-muted-foreground">
              Hospital: {selectedHospital?.attributes?.name ?? `#${derivedHospitalId}`}
            </p>
          )}
          {templateId && derivedTestId && (
            <p className="text-sm text-muted-foreground">
              Test: {selectedTest?.attributes?.name ?? `#${derivedTestId}`}
            </p>
          )}
          {isLoading ? (
            'Loading…'
          ) : (
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-b">
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Hospital Name</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Test Type</TableHead>
                  <TableHead className="w-40 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((report: any) => {
                  const p = patientsMap.get(String(report.relationships?.patient?.data?.id));
                  const h = hospitalsMap.get(String(report.relationships?.hospital?.data?.id));
                  const t = templatesMap.get(String(report.relationships?.template?.data?.id));
                  const test = testsMap.get(String(report.relationships?.test?.data?.id));
                  return (
                    <TableRow key={report.id} className="border-b hover:bg-muted/30">
                      <TableCell>{p?.attributes?.name ?? p?.attributes?.values?.patient_name ?? '-'}</TableCell>
                      <TableCell>{h?.attributes?.name ?? '-'}</TableCell>
                      <TableCell>{t?.attributes?.name ?? '-'}</TableCell>
                      <TableCell>{test?.attributes?.name ?? '-'}</TableCell>
                      <TableCell className="space-x-2 text-right">
                        {report.attributes?.pdf_url && (
                          <Link href={report.attributes.pdf_url} target="_blank">
                            <Button variant="secondary" size="sm">PDF</Button>
                          </Link>
                        )}
                        <Link href={`/reports/${report.id}`}><Button size="sm" variant="secondary">View</Button></Link>
                        <Link href={`/reports/${report.id}/edit`}><Button size="sm" variant="secondary">Edit</Button></Link>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(report.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
