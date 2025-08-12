<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

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
        'logo_url',
        'logo_path',
    ];

    protected $appends = ['logo_url'];

    public $timestamps = true;

    public function getLogoUrlAttribute(): ?string
    {
        $path = $this->attributes['logo_path'] ?? null;
        if ($path) {
            return Storage::url($path);
        }

        return $this->attributes['logo_url'] ?? null;
    }

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
