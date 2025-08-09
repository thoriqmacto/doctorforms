<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class TestResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'type'       => 'tests',
            'id'         => (string) $this->id,
            'attributes' => [
                'code'        => $this->code,
                'name'        => $this->name,
                'type'        => $this->type,
                'description' => $this->description,
            ],
            'relationships' => [
                'templates' => [
                    'links' => [
                        'related' => url("/api/v1/tests/{$this->id}/templates"),
                    ],
                ],
                'reports' => [
                    'links' => [
                        'related' => url("/api/v1/tests/{$this->id}/reports"),
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
