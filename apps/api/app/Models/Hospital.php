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
        'short_name',
        'parent_org_line',
        'address',
        'address_line_1',
        'address_line_2',
        'province',
        'city',
        'postal_code',
        'country',
        'phone',
        'fax',
        'whatsapp_phone',
        'email',
        'website',
        'logo_url',
        'logo_path',
        'secondary_logo_url',
        'secondary_logo_path',
        'accreditation_text',
        'report_footer_line',
    ];

    protected $appends = ['logo_url', 'secondary_logo_url'];

    public $timestamps = true;

    public function getLogoUrlAttribute(): ?string
    {
        $path = $this->attributes['logo_path'] ?? null;
        if ($path) {
            return Storage::url($path);
        }

        return $this->attributes['logo_url'] ?? null;
    }

    public function getSecondaryLogoUrlAttribute(): ?string
    {
        $path = $this->attributes['secondary_logo_path'] ?? null;
        if ($path) {
            return Storage::url($path);
        }

        return $this->attributes['secondary_logo_url'] ?? null;
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

    public function departments()
    {
        return $this->hasMany(HospitalDepartment::class);
    }

    public function installations()
    {
        return $this->hasMany(HospitalInstallation::class);
    }

    public function signatories()
    {
        return $this->hasMany(HospitalSignatory::class);
    }
}
