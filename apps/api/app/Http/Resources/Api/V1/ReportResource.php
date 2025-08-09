<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class ReportResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'type'       => 'reports',
            'id'         => (string) $this->id,
            'attributes' => [
                'user_id'     => $this->user_id,
                'hospital_id' => $this->hospital_id,
                'patient_id'  => $this->patient_id,
                'template_id' => $this->template_id,
                'title'       => $this->title,
                'findings'    => $this->findings,
                'conclusion'  => $this->conclusion,
                'operator'    => $this->operator,
                'supervisor'  => $this->supervisor,
                'device'      => $this->device,
                'pdf_url'     => $this->pdf_url,
                'created_at'  => optional($this->created_at)->toDateTimeString(),
                'updated_at'  => optional($this->updated_at)->toDateTimeString(),
            ],
            'relationships' => [
                'user' => $this->user_id ? [
                    'data' => ['type' => 'users', 'id' => (string) $this->user_id],
                ] : null,
                'patient' => $this->patient_id ? [
                    'data' => ['type' => 'patients', 'id' => (string) $this->patient_id],
                ] : null,
                'template' => $this->template_id ? [
                    'data' => ['type' => 'templates', 'id' => (string) $this->template_id],
                ] : null,
                'test' => $this->test_id ? [
                    'data' => ['type' => 'tests', 'id' => (string) $this->test_id],
                ] : null,
                'hospital' => $this->hospital_id ? [
                    'data' => ['type' => 'hospitals', 'id' => (string) $this->hospital_id],
                ] : null,
                'fields' => [
                    'links' => [
                        'related' => url("/api/v1/reports/{$this->id}?include=fields"),
                    ],
                ],
                'measurements' => [
                    'links' => [
                        'related' => url("/api/v1/reports/{$this->id}?include=measurements"),
                    ],
                ],
            ],
        ];
    }

    public function with($request)
    {
        return ['jsonapi' => ['version' => '1.0']];
    }
}
