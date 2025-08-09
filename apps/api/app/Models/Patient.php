<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Patient extends Model
{
    // use \Illuminate\Database\Eloquent\Factories\HasFactory;

    protected $table = 'patients';

    protected $fillable = [
        'mrn',
        'name',
        'gender',
        'dob',
        'dos',
        'age',
        'height_cm',
        'weight_kg',
        'bsa',
        'blood_pressure',
        'diagnosis_brief',
        'referring_physician',
        'hospital_id',
        'user_id',
    ];

    protected $casts = [
        'dob'        => 'date',
        'height_cm'  => 'integer',
        'weight_kg'  => 'integer',
        'bsa'        => 'decimal:2',
    ];

    public $timestamps = true;

    /*
     |--------------------------------------------------------------------------
     | Relationships
     |--------------------------------------------------------------------------
     */

    // Patient belongs to a hospital
    public function hospital()
    {
        return $this->belongsTo(Hospital::class);
    }

    // Patient belongs to a user
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Patient can have many reports
    public function reports()
    {
        return $this->hasMany(Report::class);
    }
}
