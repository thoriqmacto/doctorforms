<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    protected $table = 'reports';

    protected $fillable = [
        'user_id',
        'signatory_id',
        'hospital_id',
        'patient_id',
        'template_id',
        'test_id',
        'title',
        'findings',
        'conclusion',
        'operator',
        'supervisor',
        'device',
        'pdf_url',
        'is_completed',
        'completed_at',
    ];

    protected $casts = [
        'is_completed' => 'boolean',
        'completed_at' => 'datetime',
    ];

    public $timestamps = true;

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function template()
    {
        return $this->belongsTo(Template::class);
    }

    public function test()
    {
        return $this->belongsTo(Test::class);
    }

    public function hospital()
    {
        return $this->belongsTo(Hospital::class);
    }

    public function signatory()
    {
        return $this->belongsTo(HospitalSignatory::class, 'signatory_id');
    }

    public function fields()
    {
        return $this->hasMany(ReportField::class);
    }

    public function measurements()
    {
        return $this->hasMany(Measurement::class);
    }

    public function images()
    {
        return $this->hasMany(ReportImage::class)->orderBy('sort_order')->orderBy('id');
    }
}

