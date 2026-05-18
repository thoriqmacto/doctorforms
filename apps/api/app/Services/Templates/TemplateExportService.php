<?php

namespace App\Services\Templates;

use App\Models\Template;
use App\Models\TemplateField;
use App\Support\EntityBindingCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Serialize a Template (with its fields) into a portable TemplateExportV1
 * JSON envelope, and reconstruct a new Template from that envelope.
 *
 * Field identity in the export is (section, label) — DB ids are dropped
 * because they don't carry across environments. Foreign keys for
 * user/test/hospital/department are exported as ids; the import validates
 * them against the target database and 422s when they don't resolve.
 *
 * Imports always create a NEW template (with is_enabled=false). Updating
 * an existing template via import is intentionally out of scope.
 */
class TemplateExportService
{
    public const VERSION = 'TemplateExportV1';

    /**
     * Build the export envelope for a template. The template must have
     * its `fields` relation loaded (the caller eager-loads).
     *
     * @return array<string, mixed>
     */
    public function toExportArray(Template $template): array
    {
        $fields = $template->fields
            ->sortBy(fn (TemplateField $f) => [$f->field_group_order, $f->order, $f->id])
            ->values();

        $sections = [];
        $seenSections = [];
        foreach ($fields as $field) {
            $name = (string) $field->section;
            if (!isset($seenSections[$name])) {
                $seenSections[$name] = true;
                $sections[] = [
                    'name' => $name,
                    'kind' => \App\Http\Resources\Api\V1\TemplateResource::classifySectionKind($name),
                ];
            }
        }

        return [
            'version'     => self::VERSION,
            'exported_at' => now()->toIso8601String(),
            'template'    => [
                'name'          => $template->name,
                'description'   => $template->description,
                'user_id'       => $template->user_id,
                'test_id'       => $template->test_id,
                'hospital_id'   => $template->hospital_id,
                'department_id' => $template->department_id,
                'header_config' => $template->header_config,
                'layout_config' => $template->layout_config,
            ],
            'sections' => $sections,
            'fields'   => $fields->map(fn (TemplateField $f) => [
                'section'           => $f->section,
                'label'             => $f->label,
                'type'              => $f->type,
                'options'           => $f->options,
                'order'             => (int) $f->order,
                'field_group_order' => (int) $f->field_group_order,
                'unique_name'       => $f->unique_name,
            ])->all(),
        ];
    }

    /**
     * Create a new Template from a validated export payload. The whole
     * import runs in a single transaction — any field-level failure
     * rolls everything back so partial imports never persist.
     *
     * The caller is expected to have validated the top-level shape via
     * Laravel Validator already; this method enforces only the deeper
     * checks that need DB lookups (binding catalog, FK resolution) and
     * the template-field write fan-out.
     *
     * @throws ValidationException when a binding or required value is invalid.
     */
    public function createFromExport(array $payload): Template
    {
        $tpl = $payload['template'];
        $fields = $payload['fields'] ?? [];

        return DB::transaction(function () use ($tpl, $fields) {
            $template = Template::create([
                'name'          => $tpl['name'],
                'description'   => $tpl['description'] ?? null,
                'user_id'       => $tpl['user_id'],
                'test_id'       => $tpl['test_id'],
                'hospital_id'   => $tpl['hospital_id'],
                'department_id' => $tpl['department_id'] ?? null,
                'header_config' => $tpl['header_config'] ?? null,
                'layout_config' => $tpl['layout_config'] ?? null,
                // Imported templates always start disabled — an admin
                // must explicitly publish them. Matches the Duplicate UX
                // on the templates list.
                'is_enabled'    => false,
            ]);

            foreach ($fields as $index => $field) {
                $this->validateFieldBinding($field, $index);

                TemplateField::create([
                    'template_id'       => $template->id,
                    'section'           => (string) ($field['section'] ?? 'General'),
                    'label'             => (string) ($field['label'] ?? 'Field'),
                    'type'              => (string) $field['type'],
                    'options'           => $field['options'] ?? null,
                    'order'             => (int) ($field['order'] ?? $index),
                    'field_group_order' => (int) ($field['field_group_order'] ?? 0),
                    // unique_name is intentionally NOT passed — the model's
                    // booted() hook recomputes it from (section, label) and
                    // disambiguates with a numeric suffix on collision.
                ]);
            }

            return $template;
        });
    }

    /**
     * Reject fields with an unrecognized binding source/path. Mirrors the
     * validation in TemplateFieldController so a JSON import cannot smuggle
     * in a binding the rest of the system doesn't understand.
     */
    private function validateFieldBinding(array $field, int $index): void
    {
        $options = $field['options'] ?? null;
        if (!is_array($options)) {
            return;
        }

        $binding = $options['binding'] ?? null;
        if ($binding === null) {
            return;
        }

        if (!is_array($binding)) {
            throw ValidationException::withMessages([
                "fields.$index.options.binding" => 'binding must be an object.',
            ]);
        }

        $source = $binding['source'] ?? null;
        if (!is_string($source) || $source === '') {
            throw ValidationException::withMessages([
                "fields.$index.options.binding.source" => 'binding.source is required.',
            ]);
        }

        if ($source === 'literal') {
            if (!array_key_exists('value', $binding)) {
                throw ValidationException::withMessages([
                    "fields.$index.options.binding.value" => 'literal binding requires a value.',
                ]);
            }
            return;
        }

        if (!in_array($source, EntityBindingCatalog::sources(), true)) {
            throw ValidationException::withMessages([
                "fields.$index.options.binding.source" => "Unknown binding source: {$source}.",
            ]);
        }

        $path = $binding['path'] ?? null;
        if (!is_string($path) || $path === '') {
            throw ValidationException::withMessages([
                "fields.$index.options.binding.path" => 'binding.path is required.',
            ]);
        }

        if (!EntityBindingCatalog::isValid($source, $path)) {
            throw ValidationException::withMessages([
                "fields.$index.options.binding.path" => "Path {$source}.{$path} is not a recognized binding.",
            ]);
        }

        $type = $field['type'] ?? null;
        if (in_array($type, ['patient', 'user'], true) && $source !== $type) {
            throw ValidationException::withMessages([
                "fields.$index.options.binding.source" => "Field type {$type} requires binding.source={$type}, got {$source}.",
            ]);
        }
    }
}
