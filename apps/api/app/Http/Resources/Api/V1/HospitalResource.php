<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class HospitalResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'type'       => 'hospitals',
            'id'         => (string) $this->id,
            'attributes' => [
                'name'     => $this->name,
                'address'  => $this->address,
                'province' => $this->province,
                'city'     => $this->city,
                'phone'    => $this->phone,
                'email'    => $this->email,
                'website'  => $this->website,
                'logo_url' => $this->logo_url,
            ],
            'relationships' => [
                'patients' => [
                    'links' => [
                        'related' => url("/api/v1/hospitals/{$this->id}/patients"),
                    ],
                ],
                'templates' => [
                    'links' => [
                        'related' => url("/api/v1/hospitals/{$this->id}/templates"),
                    ],
                ],
                'users' => [
                    'links' => [
                        'related' => url("/api/v1/hospitals/{$this->id}/users"),
                    ],
                ],
                'reports' => [
                    'links' => [
                        'related' => url("/api/v1/hospitals/{$this->id}/reports"),
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
