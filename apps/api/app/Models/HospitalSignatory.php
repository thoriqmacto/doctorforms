<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class HospitalSignatory extends Model
{
    protected $table = 'hospital_signatories';

    protected $fillable = [
        'hospital_id',
        'user_id',
        'name',
        'position_title',
        'sip_number',
        'signature_image_path',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    protected $appends = ['signature_image_url'];

    public function getSignatureImageUrlAttribute(): ?string
    {
        $path = $this->attributes['signature_image_path'] ?? null;
        return $path ? Storage::url($path) : null;
    }

    public function hospital()
    {
        return $this->belongsTo(Hospital::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reports()
    {
        return $this->hasMany(Report::class, 'signatory_id');
    }
}
