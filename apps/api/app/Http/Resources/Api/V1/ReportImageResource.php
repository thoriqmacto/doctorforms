<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ReportImageResource extends JsonResource
{
    public function toArray($request)
    {
        $disk = config('filesystems.default');

        // Public storage URLs are served by the same Laravel app under
        // /storage/... thanks to `php artisan storage:link`. Falling
        // back to the raw path means the frontend's resolveAssetUrl
        // (PR #173) still produces a usable absolute URL.
        $url = null;
        try {
            $url = Storage::disk($disk)->url($this->path);
        } catch (\Throwable $e) {
            $url = '/storage/'.ltrim($this->path, '/');
        }

        return [
            'id'                   => (int) $this->id,
            'report_id'            => (int) $this->report_id,
            'template_section_key' => $this->template_section_key,
            'url'                  => $url,
            'path'                 => $this->path,
            'original_filename'    => $this->original_filename,
            'caption'              => $this->caption,
            'mime'                 => $this->mime,
            'size_bytes'           => $this->size_bytes,
            'include_in_report'    => (bool) $this->include_in_report,
            'sort_order'           => (int) $this->sort_order,
            'uploaded_by_user_id'  => $this->uploaded_by_user_id,
            // Forward-compatible extraction fields. They stay null/'none'
            // until the OCR sprint lands.
            'extraction_status'    => $this->extraction_status ?? 'none',
            'extracted_data'       => $this->extracted_data,
            'extraction_error'     => $this->extraction_error,
            'created_at'           => optional($this->created_at)->toDateTimeString(),
            'updated_at'           => optional($this->updated_at)->toDateTimeString(),
        ];
    }
}
