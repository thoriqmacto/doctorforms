<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TemplateFieldResource;
use App\Models\TemplateField;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TemplateFieldController extends Controller
{
    // GET /api/v1/template-fields
    public function index(Request $request)
    {
        $q = TemplateField::query();

        if ($request->filled('filter.template_id')) {
            $q->where('template_id', $request->integer('filter.template_id'));
        }

        $fields = $q->orderBy('id')
            ->paginate($request->integer('page.size', 25))
            ->appends($request->query());

        return TemplateFieldResource::collection($fields);
    }

    // GET /api/v1/template-fields/{template_field}
    public function show(TemplateField $templateField)
    {
        return new TemplateFieldResource($templateField);
    }

    // POST /api/v1/template-fields
    public function store(Request $request)
    {
        $v = Validator::make($request->all(), [
            'template_id'       => ['required', 'exists:templates,id'],
            'section'           => ['required', 'string', 'max:255'],
            'label'             => ['required', 'string', 'max:255'],
            'type'              => ['required', 'in:text,number,select,textarea,subtitle,title,image,date,checkbox_group,bullseye'],
            'options'           => ['nullable', 'array'],
            'order'             => ['nullable', 'integer'],
            'field_group_order' => ['nullable', 'integer'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $field = TemplateField::create($v->validated());

        return (new TemplateFieldResource($field))
            ->additional(['meta' => ['status' => 'created']])
            ->response()
            ->setStatusCode(201);
    }

    // PUT/PATCH /api/v1/template-fields/{template_field}
    public function update(Request $request, TemplateField $templateField)
    {
        $v = Validator::make($request->all(), [
            'template_id'       => ['sometimes', 'exists:templates,id'],
            'section'           => ['sometimes', 'string', 'max:255'],
            'label'             => ['sometimes', 'string', 'max:255'],
            'type'              => ['sometimes', 'in:text,number,select,textarea,subtitle,title,image,date,checkbox_group,bullseye'],
            'options'           => ['sometimes', 'nullable', 'array'],
            'order'             => ['sometimes', 'integer'],
            'field_group_order' => ['sometimes', 'integer'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $templateField->update($v->validated());

        return new TemplateFieldResource($templateField);
    }

    // DELETE /api/v1/template-fields/{template_field}
    public function destroy(TemplateField $templateField)
    {
        $templateField->delete();

        return response()->json([
            'jsonapi' => ['version' => '1.0'],
            'meta'    => ['status' => 'deleted'],
        ], 200);
    }
}

