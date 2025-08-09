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
                    'items'   => TemplateFieldResource::collection($items)->resolve(),
                ];
            }
        }

        return [
            'type'       => 'templates',
            'id'         => (string) $this->id,
            'attributes' => [
                'name'        => $this->name,
                'description' => $this->description,
            ],
            'relationships' => [
                'user'     => $this->user_id     ? ['data' => ['type' => 'users', 'id' => (string) $this->user_id]]         : null,
                'test'     => $this->test_id     ? ['data' => ['type' => 'tests', 'id' => (string) $this->test_id]]         : null,
                'hospital' => $this->hospital_id ? ['data' => ['type' => 'hospitals', 'id' => (string) $this->hospital_id]] : null,
                'fields'   => [
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
}
