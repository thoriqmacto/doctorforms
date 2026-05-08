<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeedbackMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'feedback_messages',
            'id' => (string) $this->id,
            'attributes' => [
                'message' => $this->message,
                'page_url' => $this->page_url,
                'user_agent' => $this->user_agent,
                'status' => $this->status,
                'created_at' => $this->created_at,
                'updated_at' => $this->updated_at,
                'user_name' => $this->user?->name,
                'user_email' => $this->user?->email,
            ],
        ];
    }
}
