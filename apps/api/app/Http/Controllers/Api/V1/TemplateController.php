<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TemplateResource;
use App\Models\Template;
use App\Services\Templates\TemplateExportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class TemplateController extends Controller
{
    private function isAdmin(Request $request): bool
    {
        return ($request->user()?->role ?? null) === 'admin';
    }

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

        // Non-admin users only see published templates.
        if (!$this->isAdmin($request)) {
            $query->where('is_enabled', true);
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
        if (!$template->is_enabled && !$this->isAdmin($request)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Forbidden',
                'errors'  => ['template' => ['This template is not available.']],
            ], 403);
        }

        $include = collect(explode(',', (string) $request->query('include')))
            ->map(fn ($item) => trim($item))
            ->filter();

        $allowedIncludes = ['fields', 'user', 'test', 'hospital', 'department'];

        $relations = $include
            ->intersect($allowedIncludes)
            ->values()
            ->all();

        if (!empty($relations)) {
            $template->load($relations);
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
            'layout_config' => ['sometimes', 'nullable', 'array'],
            'is_enabled'    => ['sometimes', 'boolean'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $payload = $v->validated();
        // Only admins can choose the publishing state on create. Non-admins
        // always create enabled templates (matches existing default).
        if (!$this->isAdmin($request)) {
            unset($payload['is_enabled']);
        }

        $template = Template::create($payload);

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
            'layout_config' => ['sometimes', 'nullable', 'array'],
            'is_enabled'    => ['sometimes', 'boolean'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        // Disabled templates are admin-only territory: a non-admin cannot
        // edit a disabled template at all, and cannot toggle is_enabled
        // on any template.
        if (!$this->isAdmin($request)) {
            if (!$template->is_enabled) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Forbidden',
                    'errors'  => ['template' => ['This template is not available.']],
                ], 403);
            }
            if ($request->has('is_enabled')) {
                return response()->json([
                    'status' => 'error',
                    'errors' => [
                        'is_enabled' => ['Only an administrator can change the publishing status.'],
                    ],
                ], 422);
            }
        }

        $payload = $v->validated();
        if (!$this->isAdmin($request)) {
            unset($payload['is_enabled']);
        }

        $template->update($payload);

        return (new TemplateResource($template))
            ->additional(['meta' => ['status' => 'updated']]);
    }

    // GET /api/v1/templates/{template}/export
    public function export(Template $template, TemplateExportService $service)
    {
        $template->load('fields');

        $payload = $service->toExportArray($template);

        $filename = trim($template->name) !== ''
            ? \Illuminate\Support\Str::slug($template->name).'.v1.json'
            : 'template-'.$template->id.'.v1.json';

        return response()->json($payload, 200, [
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    // POST /api/v1/templates/import
    //
    // Accepts a TemplateExportV1 envelope and creates a NEW template
    // (always disabled by default). Foreign keys come from the JSON; if
    // they don't resolve in the target database the request 422s and
    // nothing is written.
    public function import(Request $request, TemplateExportService $service)
    {
        $v = Validator::make($request->all(), [
            'version'     => ['required', 'string', 'in:'.TemplateExportService::VERSION],
            'exported_at' => ['sometimes', 'nullable', 'string'],
            'template'                  => ['required', 'array'],
            'template.name'             => ['required', 'string', 'max:255'],
            'template.description'      => ['nullable', 'string'],
            'template.user_id'          => ['required', 'integer', 'exists:users,id'],
            'template.test_id'          => ['required', 'integer', 'exists:tests,id'],
            'template.hospital_id'      => ['required', 'integer', 'exists:hospitals,id'],
            'template.department_id'    => ['nullable', 'integer', 'exists:hospital_departments,id'],
            'template.header_config'    => ['nullable', 'array'],
            'template.layout_config'    => ['nullable', 'array'],
            'sections'                  => ['sometimes', 'array'],
            'fields'                    => ['present', 'array'],
            'fields.*.section'          => ['required', 'string', 'max:255'],
            'fields.*.label'            => ['required', 'string', 'max:255'],
            'fields.*.type'             => ['required', 'in:text,number,select,textarea,subtitle,title,image,date,checkbox_group,bullseye,patient,user,measurement'],
            'fields.*.options'          => ['nullable', 'array'],
            'fields.*.order'            => ['nullable', 'integer'],
            'fields.*.field_group_order' => ['nullable', 'integer'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        try {
            $template = $service->createFromExport($v->validated());
        } catch (ValidationException $e) {
            return response()->json(['status' => 'error', 'errors' => $e->errors()], 422);
        }

        return (new TemplateResource($template->load('fields')))
            ->additional(['meta' => ['status' => 'created']])
            ->response()
            ->setStatusCode(201);
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
