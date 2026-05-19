<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_id',
        'template_section_key',
        'path',
        'original_filename',
        'caption',
        'mime',
        'size_bytes',
        'include_in_report',
        'sort_order',
        'uploaded_by_user_id',
        'extraction_status',
        'extracted_data',
        'extraction_error',
    ];

    protected $casts = [
        'include_in_report' => 'boolean',
        'sort_order'        => 'integer',
        'size_bytes'        => 'integer',
        'extracted_data'    => 'array',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }
}
