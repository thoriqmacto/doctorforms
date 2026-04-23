<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HospitalDepartment extends Model
{
    protected $table = 'hospital_departments';

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

    public function templates()
    {
        return $this->hasMany(Template::class, 'department_id');
    }
}
