<?php

namespace App\Console\Commands;

use App\Models\TemplateField;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class UpsertTemplateFieldsFromJsonCommand extends Command
{
    protected $signature = 'template-fields:upsert-json
                            {path : Path to a JSON file containing one object or an array of objects}
                            {--strict : Fail the whole command if any row is invalid}';

    protected $description = 'Upsert template fields from a JSON file';

    private const ALLOWED_TYPES = [
        'text',
        'number',
        'select',
        'textarea',
        'subtitle',
        'title',
        'image',
        'date',
        'checkbox_group',
        'bullseye',
        'patient',
        'user',
        'measurement',
    ];

    public function handle(): int
    {
        $path = (string) $this->argument('path');

        if (!is_file($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        $content = file_get_contents($path);
        if ($content === false) {
            $this->error("Unable to read file: {$path}");

            return self::FAILURE;
        }

        $payload = json_decode($content, true);
        if (!is_array($payload)) {
            $this->error('JSON must decode to an object or an array of objects.');

            return self::FAILURE;
        }

        $rows = $this->normalizeRows($payload);
        if ($rows === []) {
            $this->warn('No rows found in JSON payload.');

            return self::SUCCESS;
        }

        $strict = (bool) $this->option('strict');

        $created = 0;
        $updated = 0;
        $skipped = 0;

        foreach ($rows as $index => $row) {
            $validator = Validator::make($row, [
                'template_id' => ['required', 'integer', 'exists:templates,id'],
                'section' => ['required', 'string', 'max:255'],
                'label' => ['required', 'string', 'max:255'],
                'type' => ['required', Rule::in(self::ALLOWED_TYPES)],
                'options' => ['nullable', 'array'],
                'order' => ['nullable', 'integer'],
                'field_group_order' => ['nullable', 'integer'],
            ]);

            $validator->after(function ($validator) use ($row) {
                if (($row['type'] ?? null) !== 'measurement') {
                    return;
                }

                $options = $row['options'] ?? [];
                $requiredKeys = ['measurement_name', 'default', 'measurement_unit', 'measurement_category'];
                foreach ($requiredKeys as $key) {
                    if (!is_array($options) || blank($options[$key] ?? null)) {
                        $validator->errors()->add("options.$key", "The {$key} field is required for measurement type.");
                    }
                }
            });

            if ($validator->fails()) {
                $skipped++;
                $this->warn('Row '.($index + 1).' skipped: '.json_encode($validator->errors()->toArray()));

                if ($strict) {
                    $this->error('Strict mode enabled. Aborting.');

                    return self::FAILURE;
                }

                continue;
            }

            $validated = $validator->validated();
            $lookup = [
                'template_id' => $validated['template_id'],
                'section' => $validated['section'],
                'label' => $validated['label'],
            ];

            $matches = TemplateField::query()->where($lookup)->count();
            if ($matches > 1) {
                $skipped++;
                $this->warn('Row '.($index + 1).' skipped: multiple existing rows match template_id + section + label.');

                if ($strict) {
                    $this->error('Strict mode enabled. Aborting.');

                    return self::FAILURE;
                }

                continue;
            }

            $attributes = [
                'type' => $validated['type'],
                'options' => $validated['options'] ?? null,
                'order' => $validated['order'] ?? 0,
                'field_group_order' => $validated['field_group_order'] ?? 0,
            ];

            $field = TemplateField::query()->where($lookup)->first();

            if ($field === null) {
                TemplateField::create($lookup + $attributes);
                $created++;

                continue;
            }

            $field->fill($attributes);
            if ($field->isDirty()) {
                $field->save();
            }
            $updated++;
        }

        $this->info("Done. Created: {$created}, Updated: {$updated}, Skipped: {$skipped}");

        return self::SUCCESS;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function normalizeRows(array $payload): array
    {
        if ($payload === []) {
            return [];
        }

        $isList = array_is_list($payload);

        if ($isList) {
            return array_values(array_filter($payload, 'is_array'));
        }

        return [$payload];
    }
}
