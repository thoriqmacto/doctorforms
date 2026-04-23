<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TemplateResource;
use App\Models\Template;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TemplateController extends Controller
{
    // GET /api/v1/templates
    public function index(Request $request)
    {
        $query = Template::query();

        if ($request->filled('filter.hospital_id')) {
            $query->where('hospital_id', $request->input('filter.hospital_id'));
        }
        if ($request->filled('filter.test_id')) {
            $query->where('test_id', $request->input('filter.test_id'));
        }
        if ($request->filled('filter.user_id')) {
            $query->where('user_id', $request->input('filter.user_id'));
        }

        $includeFields = str_contains((string) $request->query('include'), 'fields');

        $templates = $query
            ->when($includeFields, fn ($q) => $q->with('fields'))
            ->orderBy('id')
            ->paginate($request->integer('page.size', 25));

        return TemplateResource::collection($templates)
            ->additional([
                'meta' => [
                    'page' => [
                        'size'       => 'A4',
                        'width_mm'   => 210,
                        'height_mm'  => 297,
                        'margins_mm' => ['top' => 12, 'right' => 12, 'bottom' => 12, 'left' => 12],
                    ],
                ],
            ]);
    }

    // GET /api/v1/templates/{template}
    public function show(Request $request, Template $template)
    {
        $includeFields = str_contains((string) $request->query('include'), 'fields');

        if ($includeFields) {
            $template->load('fields');
        }

        return new TemplateResource($template);
    }

    // POST /api/v1/templates
    public function store(Request $request)
    {
        $v = Validator::make($request->all(), [
            'name'          => ['required', 'string', 'max:255'],
            'description'   => ['nullable', 'string'],
            'user_id'       => ['required', 'exists:users,id'],
            'test_id'       => ['required', 'exists:tests,id'],
            'hospital_id'   => ['required', 'exists:hospitals,id'],
            'department_id' => ['sometimes', 'nullable', 'exists:hospital_departments,id'],
            // header_config is the structured primary source for the report header.
            // Legacy templates without it fall back to the hardcoded buildHospitalHeader.
            'header_config' => ['sometimes', 'nullable', 'array'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $template = Template::create($v->validated());

        return (new TemplateResource($template))
            ->additional(['meta' => ['status' => 'created']])
            ->response()
            ->setStatusCode(201);
    }

    // PUT/PATCH /api/v1/templates/{template}
    public function update(Request $request, Template $template)
    {
        $v = Validator::make($request->all(), [
            'name'          => ['sometimes', 'string', 'max:255'],
            'description'   => ['sometimes', 'nullable', 'string'],
            'user_id'       => ['sometimes', 'exists:users,id'],
            'test_id'       => ['sometimes', 'exists:tests,id'],
            'hospital_id'   => ['sometimes', 'exists:hospitals,id'],
            'department_id' => ['sometimes', 'nullable', 'exists:hospital_departments,id'],
            'header_config' => ['sometimes', 'nullable', 'array'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $template->update($v->validated());

        return (new TemplateResource($template))
            ->additional(['meta' => ['status' => 'updated']]);
    }

    // DELETE /api/v1/templates/{template}
    public function destroy(Template $template)
    {
        $relatedReportsCount = $template->reports()->count();

        if ($relatedReportsCount > 0) {
            return response()->json([
                'jsonapi' => ['version' => '1.0'],
                'message' => 'This template cannot be deleted because it is used by existing reports. Please delete all reports associated with this template first, then delete the template.',
                'errors' => [[
                    'status' => '409',
                    'title' => 'Template deletion blocked by associated reports',
                    'detail' => 'Delete all reports associated with this template first, then delete the template.',
                    'meta' => [
                        'related_reports_count' => $relatedReportsCount,
                    ],
                ]],
            ], 409);
        }

        $template->delete();

        return response()->json([
            'jsonapi' => ['version' => '1.0'],
            'meta'    => ['status' => 'deleted'],
        ], 200);
    }
}
