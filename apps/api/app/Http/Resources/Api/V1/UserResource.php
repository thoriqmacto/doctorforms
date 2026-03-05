<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'type'       => 'users',
            'id'         => (string) $this->id,
            'attributes' => [
                'name'  => $this->name,
                'email' => $this->email,
                'phone' => $this->phone,
                'positionTitle' => $this->position_title,
            ],
            'relationships' => [
                'hospitals' => [
                    'links' => [
                        'related' => url("/api/v1/users/{$this->id}/hospitals"),
                    ],
                ],
                'templates' => [
                    'links' => [
                        'related' => url("/api/v1/users/{$this->id}/templates"),
                    ],
                ],
                'patients' => [
                    'links' => [
                        'related' => url("/api/v1/users/{$this->id}/patients"),
                    ],
                ],
                'reports' => [
                    'links' => [
                        'related' => url("/api/v1/users/{$this->id}/reports"),
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
