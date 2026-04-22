<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TemplateFieldResource;
use App\Models\TemplateField;
use App\Support\EntityBindingCatalog;
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
        $payload = $request->all();
        if (is_string($payload['options'] ?? null)) {
            $decoded = json_decode($payload['options'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $payload['options'] = $decoded;
            }
        }

        $v = Validator::make($payload, [
            'template_id'       => ['required', 'exists:templates,id'],
            'section'           => ['required', 'string', 'max:255'],
            'label'             => ['required', 'string', 'max:255'],
            'type'              => ['required', 'in:text,number,select,textarea,subtitle,title,image,date,checkbox_group,bullseye,patient,user,measurement'],
            'options'           => ['nullable', 'array'],
            'order'             => ['nullable', 'integer'],
            'field_group_order' => ['nullable', 'integer'],
        ]);

        $v->after(function ($validator) use ($payload) {
            $type = $payload['type'] ?? null;
            $options = $payload['options'] ?? [];

            if ($type === 'measurement') {
                $requiredKeys = ['measurement_name', 'default', 'measurement_unit', 'measurement_category'];
                foreach ($requiredKeys as $key) {
                    if (!is_array($options) || blank($options[$key] ?? null)) {
                        $validator->errors()->add("options.$key", "The {$key} field is required for measurement type.");
                    }
                }
            }

            // options.binding (optional) must reference a whitelisted source+path.
            // See App\Support\EntityBindingCatalog for the legal combinations.
            self::validateBinding($validator, $type, $options);
        });

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
        $payload = $request->all();
        if (is_string($payload['options'] ?? null)) {
            $decoded = json_decode($payload['options'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $payload['options'] = $decoded;
            }
        }

        $v = Validator::make($payload, [
            'template_id'       => ['sometimes', 'exists:templates,id'],
            'section'           => ['sometimes', 'string', 'max:255'],
            'label'             => ['sometimes', 'string', 'max:255'],
            'type'              => ['sometimes', 'in:text,number,select,textarea,subtitle,title,image,date,checkbox_group,bullseye,patient,user,measurement'],
            'options'           => ['sometimes', 'nullable', 'array'],
            'order'             => ['sometimes', 'integer'],
            'field_group_order' => ['sometimes', 'integer'],
        ]);

        $v->after(function ($validator) use ($payload, $templateField) {
            $type = $payload['type'] ?? $templateField->type;
            $options = array_key_exists('options', $payload)
                ? ($payload['options'] ?? [])
                : ($templateField->options ?? []);

            if ($type === 'measurement') {
                $requiredKeys = ['measurement_name', 'default', 'measurement_unit', 'measurement_category'];
                foreach ($requiredKeys as $key) {
                    if (!is_array($options) || blank($options[$key] ?? null)) {
                        $validator->errors()->add("options.$key", "The {$key} field is required for measurement type.");
                    }
                }
            }

            self::validateBinding($validator, $type, $options);
        });

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

    /**
     * Validate options.binding against the static EntityBindingCatalog.
     *
     * Contract:
     *   options.binding: {
     *     source: "hospital"|"patient"|"user"|"report"|"signatory"|"test"|"literal",
     *     path?:  string (dotted),   // required unless source=literal
     *     value?: string,            // required when source=literal
     *     format?: string,           // optional formatter hint (e.g. "date:dd/MM/yyyy")
     *   }
     *
     * Unknown sources or non-whitelisted paths => 422. Binding is optional
     * (legacy template fields without binding remain valid).
     */
    private static function validateBinding($validator, ?string $type, $options): void
    {
        if (!is_array($options)) {
            return;
        }

        $binding = $options['binding'] ?? null;
        if ($binding === null) {
            return;
        }

        if (!is_array($binding)) {
            $validator->errors()->add('options.binding', 'binding must be an object.');
            return;
        }

        $source = $binding['source'] ?? null;
        if (!is_string($source) || $source === '') {
            $validator->errors()->add('options.binding.source', 'binding.source is required.');
            return;
        }

        if ($source === 'literal') {
            if (!array_key_exists('value', $binding)) {
                $validator->errors()->add('options.binding.value', 'literal binding requires a value.');
            }
            return;
        }

        $validSources = EntityBindingCatalog::sources();
        if (!in_array($source, $validSources, true)) {
            $validator->errors()->add('options.binding.source', "Unknown binding source: {$source}.");
            return;
        }

        $path = $binding['path'] ?? null;
        if (!is_string($path) || $path === '') {
            $validator->errors()->add('options.binding.path', 'binding.path is required.');
            return;
        }

        if (!EntityBindingCatalog::isValid($source, $path)) {
            $validator->errors()->add(
                'options.binding.path',
                "Path {$source}.{$path} is not a recognized binding."
            );
        }

        // When field type declares an entity (patient/user), the binding.source must match.
        if (in_array($type, ['patient', 'user'], true) && $source !== $type) {
            $validator->errors()->add(
                'options.binding.source',
                "Field type {$type} requires binding.source={$type}, got {$source}."
            );
        }
    }
}
