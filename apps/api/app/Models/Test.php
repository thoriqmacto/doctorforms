<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Test extends Model
{
    // If you use factories later:
    // use \Illuminate\Database\Eloquent\Factories\HasFactory;

    protected $table = 'tests';

    protected $fillable = [
        'hospital_id',
        'patient_id',
        'user_id',       // Doctor or technician performing the test
        'test_type',     // e.g., 'TTE', 'TEE', 'DSE', 'TSE'
        'test_date',
        'status',        // e.g., 'pending', 'completed', 'cancelled'
        'notes',
    ];

    protected $casts = [
        'test_date' => 'datetime',
    ];

    public $timestamps = true;

    /*
     |--------------------------------------------------------------------------
     | Relationships
     |--------------------------------------------------------------------------
     */

    // Test belongs to a hospital
    public function hospital()
    {
        return $this->belongsTo(Hospital::class);
    }

    // Test belongs to a patient
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    // Test belongs to a user (doctor/technician)
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Test has many templates (report templates)
    public function templates()
    {
        return $this->hasMany(Template::class);
    }
}
