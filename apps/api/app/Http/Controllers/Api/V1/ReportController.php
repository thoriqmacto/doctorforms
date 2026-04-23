<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\ReportResource;
use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ReportController extends Controller
{
    // GET /api/v1/reports
    public function index(Request $request)
    {
        $reports = Report::with(['patient', 'fields.templateField', 'measurements'])
            ->orderByDesc('id')
            ->paginate($request->integer('page.size', 25))
            ->appends($request->query());

        return ReportResource::collection($reports);
    }

    // GET /api/v1/reports/{report}
    public function show(Report $report)
    {
        $report->load(['patient', 'fields.templateField', 'measurements']);

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
            'user_id'      => ['required','integer','exists:users,id'],
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

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $data = $v->validated();

        $report = Report::create(collect($data)->except(['fields', 'measurements'])->toArray());

        if (!empty($data['fields'])) {
            $report->fields()->createMany($data['fields']);
        }

        if (!empty($data['measurements'])) {
            $report->measurements()->createMany($data['measurements']);
        }

        $report->load(['patient', 'fields.templateField', 'measurements']);

        return (new ReportResource($report))
            ->additional(['meta' => ['status' => 'created']])
            ->response()
            ->setStatusCode(201);
    }

    // PUT/PATCH /api/v1/reports/{report}
    public function update(Request $request, Report $report)
    {
        $v = Validator::make($request->all(), [
            'title'       => ['sometimes','string','max:255'],
            'findings'    => ['sometimes','nullable','string','max:255'],
            'conclusion'  => ['sometimes','nullable','string','max:255'],
            'operator'    => ['sometimes','nullable','string','max:255'],
            'supervisor'  => ['sometimes','nullable','string','max:255'],
            'device'      => ['sometimes','nullable','string','max:255'],
            'pdf_url'     => ['sometimes','nullable','string','max:255'],
            'user_id'      => ['sometimes','integer','exists:users,id'],
            'signatory_id' => ['sometimes','nullable','integer','exists:hospital_signatories,id'],
            'hospital_id'  => ['sometimes','integer','exists:hospitals,id'],
            'patient_id'   => ['sometimes','integer','exists:patients,id'],
            'template_id'  => ['sometimes','integer','exists:templates,id'],
            'test_id'      => ['sometimes','integer','exists:tests,id'],
            'fields'                      => ['sometimes','array'],
            'fields.*.template_field_id'  => ['required_with:fields','integer','exists:template_fields,id'],
            'fields.*.value'              => ['required_with:fields','string'],
            'measurements'                => ['sometimes','array'],
            'measurements.*.name'         => ['required_with:measurements','string','max:255'],
            'measurements.*.value'        => ['required_with:measurements','string','max:255'],
            'measurements.*.unit'         => ['sometimes','nullable','string','max:50'],
            'measurements.*.category'     => ['sometimes','nullable','string','max:50'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $data = $v->validated();

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

        $report->load(['patient', 'fields.templateField', 'measurements']);

        return new ReportResource($report);
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
