<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\Api\V1\ReportFieldResource;

class ReportResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => (string) $this->id,
            'metadata' => [
                'user_id' => $this->user_id,
                'hospital_id' => $this->hospital_id,
                'patient_id' => $this->patient_id,
                'template_id' => $this->template_id,
                'test_id' => $this->test_id,
                'title' => $this->title,
                'findings' => $this->findings,
                'conclusion' => $this->conclusion,
                'operator' => $this->operator,
                'supervisor' => $this->supervisor,
                'device' => $this->device,
                'pdf_url' => $this->pdf_url,
                'created_at' => optional($this->created_at)->toDateTimeString(),
                'updated_at' => optional($this->updated_at)->toDateTimeString(),
            ],
            'patient' => $this->whenLoaded('patient', function () {
                return [
                    'id' => (string) $this->patient->id,
                    'mrn' => $this->patient->mrn,
                    'name' => $this->patient->name,
                    'gender' => $this->patient->gender,
                    'dob' => optional($this->patient->dob)->toDateString(),
                    'dos' => $this->patient->dos ? (string) $this->patient->dos : null,
                    'age' => $this->patient->age,
                    'height_cm' => $this->patient->height_cm,
                    'weight_kg' => $this->patient->weight_kg,
                    'bsa' => $this->patient->bsa,
                    'blood_pressure' => $this->patient->blood_pressure,
                    'diagnosis_brief' => $this->patient->diagnosis_brief,
                    'referring_physician' => $this->patient->referring_physician,
                    'created_at' => optional($this->patient->created_at)->toDateTimeString(),
                    'updated_at' => optional($this->patient->updated_at)->toDateTimeString(),
                ];
            }),
            'fields' => $this->whenLoaded('fields', function () {
                return ReportFieldResource::collection($this->fields);
            }),
        ];
    }
}
