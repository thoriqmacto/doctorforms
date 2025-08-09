<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class ReportFieldResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'type'       => 'report_fields',
            'id'         => (string) $this->id,
            'attributes' => [
                'value' => $this->value,
            ],
            'relationships' => [
                'report' => $this->report_id ? [
                    'data' => ['type' => 'reports', 'id' => (string) $this->report_id],
                ] : null,
                'template_field' => $this->template_field_id ? [
                    'data' => ['type' => 'template_fields', 'id' => (string) $this->template_field_id],
                ] : null,
            ],
        ];
    }

    public function with($request)
    {
        return ['jsonapi' => ['version' => '1.0']];
    }
}
