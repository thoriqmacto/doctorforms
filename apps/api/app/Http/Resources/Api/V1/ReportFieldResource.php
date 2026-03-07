<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class ReportFieldResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => (string) $this->id,
            'template_field_id' => (int) $this->template_field_id,
            'label' => optional($this->templateField)->label,
            'type' => optional($this->templateField)->type,
            'section' => optional($this->templateField)->section,
            'field_group_order' => optional($this->templateField)->field_group_order,
            'order' => optional($this->templateField)->order,
            'value' => $this->value,
        ];
    }
}
