<?php

namespace App\Services\Patients;

use App\Models\Patient;
use App\Models\Report;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Native-PHP CSV bridge for the Patient model.
 *
 *  - {@see PatientCsvService::PATIENT_COLUMNS} is the canonical schema for
 *    the patients.csv we both write (export) and parse (import).
 *  - {@see PatientCsvService::REPORT_COLUMNS} is export-only; the reports
 *    sheet in the export bundle is intended for analysis, not round-trip
 *    import. Phase 1 imports patients only.
 *
 * Imports upsert by (mrn, hospital_id) per Open Question 5 — the same
 * MRN at two hospitals is two different patients, but the same MRN at
 * the same hospital is an update.
 *
 * No new packages: we use native fputcsv/fgetcsv + ZipArchive (which
 * ships with PHP and is enabled by default on Laravel hosts).
 */
class PatientCsvService
{
    public const PATIENT_COLUMNS = [
        // Required on import.
        'mrn',
        'name',
        'gender',
        'hospital_id',
        'user_id',
        // Optional clinical fields.
        'dob',
        'dos',
        'age',
        'height_cm',
        'weight_kg',
        'bsa',
        'blood_pressure',
        'diagnosis_brief',
        'referring_physician',
    ];

    /**
     * Static columns that appear first in reports.csv. The full header
     * row is this list followed by the dynamic measurement_* and field_*
     * columns discovered from the report set.
     */
    public const REPORT_CORE_COLUMNS = [
        'report_id',
        'title',
        'patient_id',
        'patient_mrn',
        'patient_name',
        'patient_gender',
        'patient_dob',
        'template_id',
        'template_name',
        'test_id',
        'test_code',
        'test_name',
        'hospital_id',
        'hospital_name',
        'user_id',
        'signatory_name',
        'operator',
        'supervisor',
        'device',
        'is_completed',
        'completed_at',
        'findings',
        'conclusion',
        'created_at',
        'updated_at',
    ];

    /**
     * Back-compat alias — earlier callers referenced REPORT_COLUMNS for
     * just the core header. Kept so PR #203's tests / external consumers
     * keep working; new code should reference REPORT_CORE_COLUMNS.
     */
    public const REPORT_COLUMNS = self::REPORT_CORE_COLUMNS;

    /**
     * Stream the patients matching the given query as a CSV (header row
     * + data rows). The caller is responsible for opening/closing $handle.
     *
     * @param  resource  $handle
     */
    public function writePatientsCsv($handle, Builder $query): void
    {
        fputcsv($handle, self::PATIENT_COLUMNS);

        $query
            ->orderBy('id')
            ->chunk(500, function ($chunk) use ($handle) {
                foreach ($chunk as $patient) {
                    fputcsv($handle, $this->patientRow($patient));
                }
            });
    }

    /**
     * Stream the reports belonging to the given patient query as a CSV.
     * The header row is REPORT_CORE_COLUMNS + the dynamic measurement
     * and field columns discovered from the full report set. Reports
     * with a different template just leave the columns they don't have
     * as blank cells — the file stays valid even when reports use
     * different templates.
     *
     * Two passes:
     *   1. Walk the matching reports once to collect every unique
     *      measurement name (by Measurement.name) and template field
     *      (by section + label) — without loading the full rows into
     *      memory at once. Returns the ordered column list.
     *   2. Stream the actual rows, looking each cell up by the keys
     *      computed in pass 1.
     *
     * @param  resource  $handle
     */
    public function writeReportsCsv($handle, Builder $patientQuery): void
    {
        $patientIds = $patientQuery->reorder()->pluck('id');
        if ($patientIds->isEmpty()) {
            fputcsv($handle, self::REPORT_CORE_COLUMNS);
            return;
        }

        $dynamic = $this->collectExportColumns($patientIds);

        $header = array_merge(
            self::REPORT_CORE_COLUMNS,
            array_map(fn (string $name) => 'measurement_'.$name, $dynamic['measurementColumns']),
            array_map(fn (array $f) => 'field_'.$f['key'], $dynamic['fieldColumns']),
        );
        fputcsv($handle, $header);

        Report::query()
            // template+fields are needed so report field values can be looked up
            // by template_field_id back to a (section, label) coordinate.
            ->with([
                'patient:id,mrn,name,gender,dob',
                'template:id,name',
                'test:id,code,name',
                'hospital:id,name',
                'signatory:id,name',
                'measurements',
                'fields.templateField:id,section,label',
            ])
            ->whereIn('patient_id', $patientIds)
            ->orderBy('patient_id')
            ->orderBy('id')
            ->chunk(200, function ($chunk) use ($handle, $dynamic) {
                foreach ($chunk as $report) {
                    fputcsv($handle, $this->fullReportRow($report, $dynamic));
                }
            });
    }

    /**
     * Walk every report in the export set and collect the union of
     * measurement names and template-field coordinates seen anywhere.
     * The returned arrays are sorted (alphabetical for measurements,
     * stable by (section, label) for fields) so the export header is
     * deterministic across runs with the same data.
     *
     * @param  \Illuminate\Support\Collection<int, int>  $patientIds
     * @return array{measurementColumns: list<string>, fieldColumns: list<array{key:string, section:string, label:string}>, fieldKeyByTemplateFieldId: array<int,string>}
     */
    public function collectExportColumns($patientIds): array
    {
        $measurements = [];
        $fieldKeysSeen = [];
        $fieldKeyByTemplateFieldId = [];

        Report::query()
            ->whereIn('patient_id', $patientIds)
            ->with([
                'measurements:id,report_id,name',
                'fields.templateField:id,section,label',
            ])
            ->orderBy('id')
            ->chunk(200, function ($chunk) use (
                &$measurements,
                &$fieldKeysSeen,
                &$fieldKeyByTemplateFieldId,
            ) {
                foreach ($chunk as $report) {
                    foreach ($report->measurements as $m) {
                        $name = trim((string) $m->name);
                        if ($name === '') continue;
                        $measurements[$name] = true;
                    }
                    foreach ($report->fields as $f) {
                        $tf = $f->templateField;
                        if (!$tf) continue;
                        $key = $this->fieldColumnKey((string) $tf->section, (string) $tf->label);
                        if ($key === '') continue;
                        $fieldKeysSeen[$key] = [
                            'key'     => $key,
                            'section' => (string) $tf->section,
                            'label'   => (string) $tf->label,
                        ];
                        $fieldKeyByTemplateFieldId[(int) $tf->id] = $key;
                    }
                }
            });

        ksort($measurements);
        ksort($fieldKeysSeen);

        return [
            'measurementColumns'        => array_keys($measurements),
            'fieldColumns'              => array_values($fieldKeysSeen),
            'fieldKeyByTemplateFieldId' => $fieldKeyByTemplateFieldId,
        ];
    }

    /**
     * Build a stable column suffix from a (section, label) pair.
     * Non-alphanumeric characters collapse to `_` and the result is
     * lower-cased so the column name is shell-/Excel-safe.
     */
    private function fieldColumnKey(string $section, string $label): string
    {
        $slug = function (string $s): string {
            $s = strtolower(trim($s));
            $s = preg_replace('/[^a-z0-9]+/i', '_', $s) ?? '';
            return trim($s, '_');
        };
        $left = $slug($section) ?: 'general';
        $right = $slug($label);
        if ($right === '') return '';
        return $left.'_'.$right;
    }

    /**
     * @return array<int, string|int|null>
     */
    private function patientRow(Patient $p): array
    {
        return [
            (string) $p->mrn,
            (string) $p->name,
            (string) $p->gender,
            $p->hospital_id,
            $p->user_id,
            optional($p->dob)->toDateString(),
            $p->dos !== null ? (string) $p->dos : '',
            $p->age,
            $p->height_cm,
            $p->weight_kg,
            $p->bsa,
            (string) ($p->blood_pressure ?? ''),
            (string) ($p->diagnosis_brief ?? ''),
            (string) ($p->referring_physician ?? ''),
        ];
    }

    /**
     * Build a full reports.csv row: core columns first, then dynamic
     * measurement_* values, then dynamic field_* values. Cells that
     * the report doesn't have are emitted as empty strings so the row
     * width stays constant.
     *
     * @param  array{measurementColumns: list<string>, fieldColumns: list<array{key:string, section:string, label:string}>, fieldKeyByTemplateFieldId: array<int,string>}  $dynamic
     * @return array<int, string|int|null>
     */
    private function fullReportRow(Report $r, array $dynamic): array
    {
        $core = [
            $r->id,
            (string) ($r->title ?? ''),
            $r->patient_id,
            (string) ($r->patient?->mrn ?? ''),
            (string) ($r->patient?->name ?? ''),
            (string) ($r->patient?->gender ?? ''),
            optional($r->patient?->dob)->toDateString() ?? '',
            $r->template_id,
            (string) ($r->template?->name ?? ''),
            $r->test_id,
            (string) ($r->test?->code ?? ''),
            (string) ($r->test?->name ?? ''),
            $r->hospital_id,
            (string) ($r->hospital?->name ?? ''),
            $r->user_id,
            (string) ($r->signatory?->name ?? ''),
            (string) ($r->operator ?? ''),
            (string) ($r->supervisor ?? ''),
            (string) ($r->device ?? ''),
            $r->is_completed ? '1' : '0',
            optional($r->completed_at)->toIso8601String() ?? '',
            (string) ($r->findings ?? ''),
            (string) ($r->conclusion ?? ''),
            optional($r->created_at)->toDateTimeString() ?? '',
            optional($r->updated_at)->toDateTimeString() ?? '',
        ];

        $measurementValueByName = [];
        foreach ($r->measurements as $m) {
            $name = trim((string) $m->name);
            if ($name === '') continue;
            // Last write wins if a report duplicates a measurement name;
            // this matches the report viewer's behavior.
            $measurementValueByName[$name] = (string) ($m->value ?? '');
        }
        $measurementCells = [];
        foreach ($dynamic['measurementColumns'] as $name) {
            $measurementCells[] = $measurementValueByName[$name] ?? '';
        }

        $fieldValueByKey = [];
        foreach ($r->fields as $f) {
            $key = $dynamic['fieldKeyByTemplateFieldId'][(int) $f->template_field_id] ?? null;
            if ($key === null) continue;
            $fieldValueByKey[$key] = (string) ($f->value ?? '');
        }
        $fieldCells = [];
        foreach ($dynamic['fieldColumns'] as $col) {
            $fieldCells[] = $fieldValueByKey[$col['key']] ?? '';
        }

        return array_merge($core, $measurementCells, $fieldCells);
    }

    /**
     * Process a CSV file row-by-row. Validation failures are collected
     * per-row; one bad row does not stop the file. Returns a structured
     * summary the controller serializes as JSON.
     *
     * @param  resource  $handle  CSV file opened for reading.
     * @return array{total:int, succeeded:int, failed:int, created:int, updated:int, results: list<array<string, mixed>>}
     */
    public function importPatientsCsv($handle): array
    {
        $header = fgetcsv($handle);
        if ($header === false || !is_array($header)) {
            throw new \RuntimeException('The CSV file is empty or unreadable.');
        }

        $header = array_map(fn ($cell) => is_string($cell) ? trim($cell) : '', $header);
        $columnIndex = [];
        foreach ($header as $i => $name) {
            if ($name !== '') {
                $columnIndex[$name] = $i;
            }
        }

        $required = ['mrn', 'name', 'gender', 'hospital_id', 'user_id'];
        foreach ($required as $column) {
            if (!isset($columnIndex[$column])) {
                throw new \RuntimeException("Missing required CSV column: {$column}.");
            }
        }

        $results = [];
        $total = 0;
        $succeeded = 0;
        $failed = 0;
        $created = 0;
        $updated = 0;
        $rowNumber = 1; // header is row 1, data starts at row 2.

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;

            // Skip fully-blank rows so trailing newlines don't pollute the report.
            if (!array_filter($row, fn ($v) => $v !== null && trim((string) $v) !== '')) {
                continue;
            }
            $total++;

            $assoc = $this->extractAssoc($row, $columnIndex);

            try {
                $outcome = $this->upsertFromRow($assoc);
                $succeeded++;
                if ($outcome['action'] === 'created') {
                    $created++;
                } else {
                    $updated++;
                }
                $results[] = [
                    'row'        => $rowNumber,
                    'status'     => 'success',
                    'action'     => $outcome['action'],
                    'patient_id' => $outcome['patient_id'],
                ];
            } catch (\Illuminate\Validation\ValidationException $e) {
                $failed++;
                $results[] = [
                    'row'    => $rowNumber,
                    'status' => 'failed',
                    'errors' => $e->errors(),
                ];
            } catch (\Throwable $e) {
                $failed++;
                $results[] = [
                    'row'    => $rowNumber,
                    'status' => 'failed',
                    'errors' => ['_' => [$e->getMessage()]],
                ];
            }
        }

        return [
            'total'     => $total,
            'succeeded' => $succeeded,
            'failed'    => $failed,
            'created'   => $created,
            'updated'   => $updated,
            'results'   => $results,
        ];
    }

    /**
     * @param  array<int, string|null>  $row
     * @param  array<string, int>  $columnIndex
     * @return array<string, mixed>
     */
    private function extractAssoc(array $row, array $columnIndex): array
    {
        $out = [];
        foreach ($columnIndex as $name => $i) {
            $value = $row[$i] ?? null;
            if (is_string($value)) {
                $value = trim($value);
            }
            $out[$name] = $value === '' ? null : $value;
        }
        return $out;
    }

    /**
     * Validate one row and create-or-update the Patient identified by
     * (mrn, hospital_id). Wrapped in its own transaction so a failure
     * here does not poison adjacent rows.
     *
     * @param  array<string, mixed>  $row
     * @return array{action: 'created'|'updated', patient_id: int}
     */
    private function upsertFromRow(array $row): array
    {
        $v = Validator::make($row, [
            'mrn'                 => ['required', 'string', 'max:50'],
            'name'                => ['required', 'string', 'max:255'],
            'gender'              => ['required', 'in:male,female,Male,Female,MALE,FEMALE'],
            'hospital_id'         => ['required', 'integer', 'exists:hospitals,id'],
            'user_id'             => ['required', 'integer', 'exists:users,id'],
            'dob'                 => ['nullable', 'date'],
            'dos'                 => ['nullable', 'string', 'max:20'],
            'age'                 => ['nullable', 'integer', 'min:0', 'max:150'],
            'height_cm'           => ['nullable', 'integer', 'min:0', 'max:300'],
            'weight_kg'           => ['nullable', 'integer', 'min:0', 'max:500'],
            'bsa'                 => ['nullable', 'numeric', 'min:0', 'max:4'],
            'blood_pressure'      => ['nullable', 'string', 'max:15'],
            'diagnosis_brief'     => ['nullable', 'string', 'max:500'],
            'referring_physician' => ['nullable', 'string', 'max:255'],
        ]);

        $v->validate();

        $payload = $v->validated();
        $payload['gender'] = strtolower((string) $payload['gender']);

        return DB::transaction(function () use ($payload) {
            $existing = Patient::query()
                ->where('mrn', $payload['mrn'])
                ->where('hospital_id', $payload['hospital_id'])
                ->first();

            if ($existing) {
                $existing->update($payload);
                return ['action' => 'updated', 'patient_id' => $existing->id];
            }

            $patient = Patient::create($payload);
            return ['action' => 'created', 'patient_id' => $patient->id];
        });
    }
}
