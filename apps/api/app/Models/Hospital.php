<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Hospital extends Model
{
    // If you plan to use factories later:
    // use \Illuminate\Database\Eloquent\Factories\HasFactory;

    protected $table = 'hospitals';

    protected $fillable = [
        'name',
        'address',
        'phone',
        'email',
    ];

    public $timestamps = true;

    /*
     |--------------------------------------------------------------------------
     | Relationships
     |--------------------------------------------------------------------------
     */

    // One hospital can have many patients
    public function patients()
    {
        return $this->hasMany(Patient::class);
    }

    // One hospital can have many templates
    public function templates()
    {
        return $this->hasMany(Template::class);
    }

    // Optional: hospital may have many users (staff, doctors)
    public function users()
    {
        return $this->belongsToMany(User::class, 'hospital_user');
    }

    // One hospital can have many reports
    public function reports()
    {
        return $this->hasMany(Report::class);
    }
}
