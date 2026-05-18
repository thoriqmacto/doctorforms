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

    public const REPORT_COLUMNS = [
        'report_id',
        'title',
        'patient_id',
        'patient_mrn',
        'patient_name',
        'template_id',
        'template_name',
        'test_id',
        'test_code',
        'hospital_id',
        'user_id',
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
     * Reports are flattened into one row each, with denormalized
     * patient_mrn / patient_name / template_name / test_code columns so
     * the file is useful on its own (e.g. opened in Excel).
     *
     * @param  resource  $handle
     */
    public function writeReportsCsv($handle, Builder $patientQuery): void
    {
        fputcsv($handle, self::REPORT_COLUMNS);

        $patientIds = $patientQuery->reorder()->pluck('id');
        if ($patientIds->isEmpty()) {
            return;
        }

        Report::query()
            ->with(['patient:id,mrn,name', 'template:id,name', 'test:id,code'])
            ->whereIn('patient_id', $patientIds)
            ->orderBy('patient_id')
            ->orderBy('id')
            ->chunk(500, function ($chunk) use ($handle) {
                foreach ($chunk as $report) {
                    fputcsv($handle, $this->reportRow($report));
                }
            });
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
     * @return array<int, string|int|null>
     */
    private function reportRow(Report $r): array
    {
        return [
            $r->id,
            (string) ($r->title ?? ''),
            $r->patient_id,
            (string) ($r->patient?->mrn ?? ''),
            (string) ($r->patient?->name ?? ''),
            $r->template_id,
            (string) ($r->template?->name ?? ''),
            $r->test_id,
            (string) ($r->test?->code ?? ''),
            $r->hospital_id,
            $r->user_id,
            (string) ($r->operator ?? ''),
            (string) ($r->supervisor ?? ''),
            (string) ($r->device ?? ''),
            $r->is_completed ? '1' : '0',
            optional($r->completed_at)->toIso8601String(),
            (string) ($r->findings ?? ''),
            (string) ($r->conclusion ?? ''),
            optional($r->created_at)->toDateTimeString(),
            optional($r->updated_at)->toDateTimeString(),
        ];
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
