<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HospitalInstallation extends Model
{
    protected $table = 'hospital_installations';

    protected $fillable = [
        'hospital_id',
        'name',
        'code',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function hospital()
    {
        return $this->belongsTo(Hospital::class);
    }
}
