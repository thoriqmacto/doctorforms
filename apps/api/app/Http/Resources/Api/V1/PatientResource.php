<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class PatientResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'type' => 'patients',
            'id'   => (string) $this->id,
            'attributes' => [
                'mrn'                 => $this->mrn,
                'name'                => $this->name,
                'gender'              => $this->gender,            // expect lowercase 'male'/'female' per SQLite CHECK
                'dob'                 => optional($this->dob)->toDateString(),
                'dos'                 => $this->dos ? (string) $this->dos : null, // if stored as string
                'age'                 => $this->age,
                'height_cm'           => $this->height_cm,
                'weight_kg'           => $this->weight_kg,
                'bsa'                 => $this->bsa,
                'blood_pressure'      => $this->blood_pressure,    // string like "120/80"
                'diagnosis_brief'     => $this->diagnosis_brief,
                'referring_physician' => $this->referring_physician,
                'created_at'          => optional($this->created_at)->toDateTimeString(),
                'updated_at'          => optional($this->updated_at)->toDateTimeString(),
            ],
            'relationships' => [
                'hospital' => $this->hospital_id ? [
                    'data' => ['type' => 'hospitals', 'id' => (string) $this->hospital_id],
                ] : null,
                'user'     => $this->user_id ? [
                    'data' => ['type' => 'users', 'id' => (string) $this->user_id],
                ] : null,
                // If you decide to include tests later:
                // 'tests' => [
                //   'links' => ['related' => url("/api/v1/patients/{$this->id}/tests")],
                // ],
            ],
        ];
    }

    public function with($request)
    {
        return ['jsonapi' => ['version' => '1.0']];
    }
}
