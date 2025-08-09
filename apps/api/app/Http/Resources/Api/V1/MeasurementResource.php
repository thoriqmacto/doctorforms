<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class MeasurementResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'type'       => 'measurements',
            'id'         => (string) $this->id,
            'attributes' => [
                'name'     => $this->name,
                'value'    => $this->value,
                'unit'     => $this->unit,
                'category' => $this->category,
            ],
            'relationships' => [
                'report' => $this->report_id ? [
                    'data' => ['type' => 'reports', 'id' => (string) $this->report_id],
                ] : null,
            ],
        ];
    }

    public function with($request)
    {
        return ['jsonapi' => ['version' => '1.0']];
    }
}
