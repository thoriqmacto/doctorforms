<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\ReportResource;
use App\Models\HospitalSignatory;
use App\Models\Report;
use App\Models\Template;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ReportController extends Controller
{
    // GET /api/v1/reports
    public function index(Request $request)
    {
        $query = Report::with([
            'patient',
            'hospital',
            'user',
            'template.fields',
            'fields.templateField',
            'measurements',
            'signatory',
        ]);

        // Accept both `filter[xxx]` (idiomatic Laravel bracket syntax) and
        // the legacy `filter.xxx` flat key style that some existing callers
        // pass. PHP's parse_str rewrites the literal dot in the query
        // string to an underscore, so the legacy style lands in the input
        // bag as `filter_xxx`.
        $f = function (string $key) use ($request) {
            $bracket = $request->input("filter.$key");
            if ($bracket !== null && $bracket !== '') {
                return $bracket;
            }
            $flat = $request->input("filter_$key");
            if ($flat !== null && $flat !== '') {
                return $flat;
            }
            return null;
        };
        $fHas = function (string $key) use ($request) {
            return $request->has("filter.$key") || $request->has("filter_$key");
        };

        if (!is_null($f('hospital_id'))) {
            $query->where('hospital_id', (int) $f('hospital_id'));
        }
        if (!is_null($f('patient_id'))) {
            $query->where('patient_id', (int) $f('patient_id'));
        }
        if (!is_null($f('template_id'))) {
            $query->where('template_id', (int) $f('template_id'));
        }
        if (!is_null($f('user_id'))) {
            $query->where('user_id', (int) $f('user_id'));
        }
        if ($fHas('is_completed')) {
            $raw = strtolower((string) $f('is_completed'));
            $bool = in_array($raw, ['1', 'true', 'yes', 'on'], true);
            $query->where('is_completed', $bool);
        }
        if (!is_null($f('q'))) {
            $q = trim((string) $f('q'));
            if ($q !== '') {
                $query->where(function ($w) use ($q) {
                    $w->where('title', 'like', "%{$q}%")
                        ->orWhere('operator', 'like', "%{$q}%")
                        ->orWhere('supervisor', 'like', "%{$q}%")
                        ->orWhere('device', 'like', "%{$q}%")
                        ->orWhereHas('patient', function ($p) use ($q) {
                            $p->where('name', 'like', "%{$q}%")
                                ->orWhere('mrn', 'like', "%{$q}%");
                        })
                        ->orWhereHas('hospital', fn ($h) => $h->where('name', 'like', "%{$q}%"))
                        ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$q}%"));
                });
            }
        }

        // Sort. Default to most-recently-updated (matches "Last modified"
        // column in the list table).
        $sort = (string) $request->input('sort', '-updated_at');
        $allowed = ['id', 'title', 'updated_at', 'created_at', 'is_completed'];
        $field = ltrim($sort, '-');
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        if (!in_array($field, $allowed, true)) {
            $field = 'updated_at';
            $direction = 'desc';
        }
        $query->orderBy($field, $direction);

        $reports = $query
            ->paginate($request->integer('page.size', 25))
            ->appends($request->query());

        return ReportResource::collection($reports);
    }

    // GET /api/v1/reports/{report}
    public function show(Report $report)
    {
        $report->load(['patient', 'fields.templateField', 'measurements', 'signatory', 'template.fields']);

        return new ReportResource($report);
    }

    // POST /api/v1/reports
    public function store(Request $request)
    {
        $v = Validator::make($request->all(), [
            'title'       => ['required','string','max:255'],
            'findings'    => ['sometimes','nullable','string','max:255'],
            'conclusion'  => ['sometimes','nullable','string','max:255'],
            'operator'    => ['sometimes','nullable','string','max:255'],
            'supervisor'  => ['sometimes','nullable','string','max:255'],
            'device'      => ['sometimes','nullable','string','max:255'],
            'pdf_url'     => ['sometimes','nullable','string','max:255'],
            'user_id'      => ['sometimes','nullable','integer','exists:users,id'],
            'signatory_id' => ['sometimes','nullable','integer','exists:hospital_signatories,id'],
            'hospital_id'  => ['required','integer','exists:hospitals,id'],
            'patient_id'   => ['required','integer','exists:patients,id'],
            'template_id'  => ['required','integer','exists:templates,id'],
            'test_id'      => ['required','integer','exists:tests,id'],
            'fields'                      => ['sometimes','array'],
            'fields.*.template_field_id'  => ['required_with:fields','integer','exists:template_fields,id'],
            'fields.*.value'              => ['required_with:fields','string'],
            'measurements'                => ['sometimes','array'],
            'measurements.*.name'         => ['required_with:measurements','string','max:255'],
            'measurements.*.value'        => ['required_with:measurements','string','max:255'],
            'measurements.*.unit'         => ['sometimes','nullable','string','max:50'],
            'measurements.*.category'     => ['sometimes','nullable','string','max:50'],
        ]);

        $v->after(function ($validator) use ($request) {
            $this->validateSignatoryBelongsToHospital(
                $validator,
                $request->input('signatory_id'),
                $request->input('hospital_id'),
            );
            $this->validateTemplateIsAvailable(
                $validator,
                $request,
                $request->input('template_id'),
            );
        });

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $data = $v->validated();

        $authUser = $request->user();
        if (!$authUser) {
            return response()->json(['status' => 'error', 'message' => 'Authenticated user is required to create a report.'], 401);
        }

        if (($authUser->role ?? null) === 'admin') {
            $data['user_id'] = array_key_exists('user_id', $data) && $data['user_id'] !== null
                ? $data['user_id']
                : $authUser->id;
        } else {
            $data['user_id'] = $authUser->id;
        }

        // Default the operator to the current user's name on create when the
        // client did not supply one. Edit-form metadata can still override
        // this later. Admin and non-admin alike get the auto-fill.
        if (empty($data['operator'])) {
            $authedName = $request->user()?->name;
            if (is_string($authedName) && trim($authedName) !== '') {
                $data['operator'] = $authedName;
            }
        }

        $report = Report::create(collect($data)->except(['fields', 'measurements'])->toArray());

        if (!empty($data['fields'])) {
            $report->fields()->createMany($data['fields']);
        }

        if (!empty($data['measurements'])) {
            $report->measurements()->createMany($data['measurements']);
        }

        $report->load(['patient', 'fields.templateField', 'measurements', 'signatory', 'template.fields']);

        return (new ReportResource($report))
            ->additional(['meta' => ['status' => 'created']])
            ->response()
            ->setStatusCode(201);
    }

    // PUT/PATCH /api/v1/reports/{report}
    public function update(Request $request, Report $report)
    {
        // Relationship FKs (patient/template/test/hospital) are immutable
        // for non-admin users. Reject the whole request if any of those is
        // present in the payload to keep the contract explicit.
        if (($request->user()?->role ?? null) !== 'admin') {
            $lockedKeys = ['patient_id', 'template_id', 'test_id', 'hospital_id', 'user_id'];
            $blocked = collect($lockedKeys)->filter(fn ($key) => $request->has($key))->all();
            if (!empty($blocked)) {
                $errors = collect($blocked)->mapWithKeys(fn ($key) => [
                    $key => [$key === 'user_id'
                        ? 'Only an administrator can change report ownership.'
                        : 'Only an administrator can change this relationship after the report has been created.'],
                ])->all();
                return response()->json(['status' => 'error', 'errors' => $errors], 422);
            }
        }

        $v = Validator::make($request->all(), [
            'title'       => ['sometimes','string','max:255'],
            'findings'    => ['sometimes','nullable','string','max:255'],
            'conclusion'  => ['sometimes','nullable','string','max:255'],
            'operator'    => ['sometimes','nullable','string','max:255'],
            'supervisor'  => ['sometimes','nullable','string','max:255'],
            'device'      => ['sometimes','nullable','string','max:255'],
            'pdf_url'     => ['sometimes','nullable','string','max:255'],
            'user_id'      => ['sometimes','nullable','integer','exists:users,id'],
            'signatory_id' => ['sometimes','nullable','integer','exists:hospital_signatories,id'],
            'hospital_id'  => ['sometimes','integer','exists:hospitals,id'],
            'patient_id'   => ['sometimes','integer','exists:patients,id'],
            'template_id'  => ['sometimes','integer','exists:templates,id'],
            'test_id'      => ['sometimes','integer','exists:tests,id'],
            'is_completed' => ['sometimes', 'boolean'],
            'fields'                      => ['sometimes','array'],
            'fields.*.template_field_id'  => ['required_with:fields','integer','exists:template_fields,id'],
            'fields.*.value'              => ['required_with:fields','string'],
            'measurements'                => ['sometimes','array'],
            'measurements.*.name'         => ['required_with:measurements','string','max:255'],
            'measurements.*.value'        => ['required_with:measurements','string','max:255'],
            'measurements.*.unit'         => ['sometimes','nullable','string','max:50'],
            'measurements.*.category'     => ['sometimes','nullable','string','max:50'],
        ]);

        $v->after(function ($validator) use ($request, $report) {
            if ($request->has('signatory_id')) {
                $hospitalId = $request->input('hospital_id', $report->hospital_id);
                $this->validateSignatoryBelongsToHospital(
                    $validator,
                    $request->input('signatory_id'),
                    $hospitalId,
                );
            }

            // Only re-check publishing status when template_id is being
            // changed. Existing reports that still reference a now-disabled
            // template can keep being edited (matches the "do not break
            // old reports" requirement).
            if ($request->has('template_id')) {
                $this->validateTemplateIsAvailable(
                    $validator,
                    $request,
                    $request->input('template_id'),
                );
            }
        });

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $data = $v->validated();

        // Keep completed_at in sync with is_completed so the column can be
        // surfaced in the list without a per-row event log.
        if (array_key_exists('is_completed', $data)) {
            if ($data['is_completed']) {
                if (!$report->completed_at) {
                    $data['completed_at'] = now();
                }
            } else {
                $data['completed_at'] = null;
            }
        }

        $report->update(collect($data)->except(['fields', 'measurements'])->toArray());

        if (array_key_exists('fields', $data)) {
            $report->fields()->delete();
            if (!empty($data['fields'])) {
                $report->fields()->createMany($data['fields']);
            }
        }

        if (array_key_exists('measurements', $data)) {
            $report->measurements()->delete();
            if (!empty($data['measurements'])) {
                $report->measurements()->createMany($data['measurements']);
            }
        }

        $report->load(['patient', 'fields.templateField', 'measurements', 'signatory', 'template.fields']);

        return new ReportResource($report);
    }

    private function validateTemplateIsAvailable($validator, Request $request, $templateId): void
    {
        if (!$templateId) {
            return;
        }
        if (($request->user()?->role ?? null) === 'admin') {
            return;
        }
        $template = Template::find($templateId);
        if (!$template) {
            return; // exists rule will catch missing ids
        }
        if (!$template->is_enabled) {
            $validator->errors()->add(
                'template_id',
                'Template is disabled and cannot be used to create or update a report.'
            );
        }
    }

    private function validateSignatoryBelongsToHospital($validator, $signatoryId, $hospitalId): void
    {
        if (!$signatoryId) {
            return;
        }

        $signatory = HospitalSignatory::find($signatoryId);
        if (!$signatory) {
            return; // exists rule will catch missing ids
        }

        if ($hospitalId && (int) $signatory->hospital_id !== (int) $hospitalId) {
            $validator->errors()->add('signatory_id', 'Selected signatory does not belong to this hospital.');
            return;
        }

        if (!$signatory->active) {
            $validator->errors()->add('signatory_id', 'Selected signatory is inactive.');
        }
    }

    // DELETE /api/v1/reports/{report}
    public function destroy(Report $report)
    {
        $report->delete();

        return response()->json([
            'jsonapi' => ['version' => '1.0'],
            'meta'    => ['status' => 'deleted'],
        ], 200);
    }
}
