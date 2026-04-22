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
                'name'                => $this->name,
                'short_name'          => $this->short_name,
                'parent_org_line'     => $this->parent_org_line,
                'address'             => $this->address,
                'address_line_1'      => $this->address_line_1,
                'address_line_2'      => $this->address_line_2,
                'province'            => $this->province,
                'city'                => $this->city,
                'postal_code'         => $this->postal_code,
                'country'             => $this->country,
                'phone'               => $this->phone,
                'fax'                 => $this->fax,
                'whatsapp_phone'      => $this->whatsapp_phone,
                'email'               => $this->email,
                'website'             => $this->website,
                'logo_url'            => $this->logo_url,
                'secondary_logo_url'  => $this->secondary_logo_url,
                'accreditation_text'  => $this->accreditation_text,
                'report_footer_line'  => $this->report_footer_line,
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
                'departments' => [
                    'data' => $this->when(
                        $this->relationLoaded('departments'),
                        fn() => $this->departments->map(fn ($d) => [
                            'type' => 'hospital_departments',
                            'id'   => (string) $d->id,
                            'attributes' => [
                                'name'   => $d->name,
                                'code'   => $d->code,
                                'active' => (bool) $d->active,
                            ],
                        ])->values()->all(),
                    ),
                ],
                'installations' => [
                    'data' => $this->when(
                        $this->relationLoaded('installations'),
                        fn() => $this->installations->map(fn ($i) => [
                            'type' => 'hospital_installations',
                            'id'   => (string) $i->id,
                            'attributes' => [
                                'name'   => $i->name,
                                'code'   => $i->code,
                                'active' => (bool) $i->active,
                            ],
                        ])->values()->all(),
                    ),
                ],
                'signatories' => [
                    'data' => $this->when(
                        $this->relationLoaded('signatories'),
                        fn() => $this->signatories->map(fn ($s) => [
                            'type' => 'hospital_signatories',
                            'id'   => (string) $s->id,
                            'attributes' => [
                                'name'                 => $s->name,
                                'position_title'       => $s->position_title,
                                'sip_number'           => $s->sip_number,
                                'signature_image_url'  => $s->signature_image_url,
                                'active'               => (bool) $s->active,
                                'user_id'              => $s->user_id ? (string) $s->user_id : null,
                            ],
                        ])->values()->all(),
                    ),
                ],
            ],
        ];
    }

    public function with($request)
    {
        return ['jsonapi' => ['version' => '1.0']];
    }
}
