<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class TemplateResource extends JsonResource
{
    public function toArray($request)
    {
        $grouped = null;

        if ($this->relationLoaded('fields')) {
            $sections = $this->fields
                ->sortBy('order')
                ->sortBy('field_group_order')
                ->groupBy('section');

            $grouped = [];
            foreach ($sections as $section => $items) {
                $grouped[] = [
                    'section' => $section,
                    'kind'    => self::classifySectionKind((string) $section),
                    'items'   => TemplateFieldResource::collection($items)->resolve(),
                ];
            }
        }

        return [
            'type'       => 'templates',
            'id'         => (string) $this->id,
            'attributes' => [
                'name'          => $this->name,
                'description'   => $this->description,
                // Primary source for the report header (structured block config).
                // Null => consumers fall back to legacy Header-section rendering.
                'header_config' => $this->header_config,
            ],
            'relationships' => [
                'user'       => $this->user_id       ? ['data' => ['type' => 'users',                'id' => (string) $this->user_id]]        : null,
                'test'       => $this->test_id       ? ['data' => ['type' => 'tests',                'id' => (string) $this->test_id]]        : null,
                'hospital'   => $this->hospital_id   ? ['data' => ['type' => 'hospitals',            'id' => (string) $this->hospital_id]]    : null,
                'department' => $this->department_id ? ['data' => ['type' => 'hospital_departments', 'id' => (string) $this->department_id]]  : null,
                'fields'     => [
                    'links' => [
                        'related' => url("/api/v1/templates/{$this->id}?include=fields"),
                    ],
                ],
            ],
            'meta' => [
                'page' => [
                    'size'       => 'A4',
                    'width_mm'   => 210,
                    'height_mm'  => 297,
                    'margins_mm' => ['top' => 12, 'right' => 12, 'bottom' => 12, 'left' => 12],
                ],
                'grouped_sections' => $grouped,
            ],
        ];
    }

    public function with($request)
    {
        return ['jsonapi' => ['version' => '1.0']];
    }

    /**
     * Classify a section by name into a stable "kind" consumed by the render plan.
     * Frontend HTML and PDF renderers use this to pick the right block layout
     * instead of re-implementing regex matching in two places.
     */
    public static function classifySectionKind(string $name): string
    {
        $normalized = strtolower(trim($name));

        if ($normalized === '' || $normalized === 'header') {
            return 'header';
        }

        if (str_starts_with($normalized, 'findings_') || $normalized === 'findings') {
            return 'findings';
        }

        if (str_contains($normalized, 'conclusion')) {
            return 'conclusion';
        }

        if (str_contains($normalized, 'signature')) {
            return 'signature';
        }

        if (preg_match('/(measurement|calculation|2d|m-mode|doppler|hemodynamic|indices)/', $normalized) === 1) {
            return 'measurements';
        }

        return 'general';
    }
}
