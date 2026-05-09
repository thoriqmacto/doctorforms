<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class HospitalSignatoryResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'type' => 'hospital_signatories',
            'id' => (string) $this->id,
            'attributes' => [
                'hospital_id' => $this->hospital_id,
                'user_id' => $this->user_id,
                'name' => $this->name,
                'position_title' => $this->position_title,
                'sip_number' => $this->sip_number,
                'active' => (bool) $this->active,
                'signature_image_path' => $this->signature_image_path,
                'signature_image_url' => $this->signature_image_url,
                'created_at' => $this->created_at,
                'updated_at' => $this->updated_at,
                'user_name' => $this->whenLoaded('user', fn () => $this->user?->name),
                'user_email' => $this->whenLoaded('user', fn () => $this->user?->email),
                'hospital_name' => $this->whenLoaded('hospital', fn () => $this->hospital?->name),
            ],
        ];
    }

    public function with($request): array
    {
        return ['jsonapi' => ['version' => '1.0']];
    }
}
