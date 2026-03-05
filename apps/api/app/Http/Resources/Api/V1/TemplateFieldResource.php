<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class TemplateFieldResource extends JsonResource
{
    public function toArray($request)
    {
        $options = $this->options;
        if (is_string($options)) {
            $decoded = json_decode($options, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $options = $decoded;
            }
        }

        return [
            'type'       => 'template_fields',
            'id'         => (string) $this->id,
            'attributes' => [
                'section'           => $this->section,
                'label'             => $this->label,
                'unique_name'       => $this->unique_name,
                'type'              => $this->type,  // text|number|select|textarea|title|image
                'options'           => $options,     // array|null
                'order'             => (int) $this->order,
                'field_group_order' => (int) $this->field_group_order,
            ],
            'relationships' => [
                'template' => [
                    'data' => ['type' => 'templates', 'id' => (string) $this->template_id],
                ],
            ],
        ];
    }
}
