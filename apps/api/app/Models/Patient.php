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
        'user_id',           // <-- make sure this is present
        'template_id',       // if you store it here
        'test_id',           // if you store it here
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

    // Patient can have many tests
    public function tests()
    {
        return $this->hasMany(Test::class);
    }

    // If you want to link patient to templates (e.g., filled reports)
    public function templates()
    {
        return $this->hasMany(Template::class);
    }
}
