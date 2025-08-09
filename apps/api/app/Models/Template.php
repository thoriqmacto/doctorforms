<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Template extends Model
{
    protected $table = 'templates';

    // Allow mass assignment for seeder
    protected $fillable = [
        'name',
        'description',
        'user_id',
        'test_id',
        'hospital_id',
    ];

    // timestamps (created_at, updated_at)
    public $timestamps = true;

    // relations
    public function fields()
    {
        return $this->hasmany(TemplateField::class, 'template_id');
    }

    // Template belongs to a user
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Template belongs to a test
    public function test()
    {
        return $this->belongsTo(Test::class);
    }

    // Template belongs to a hospital
    public function hospital()
    {
        return $this->belongsTo(Hospital::class);
    }

    // Template has many reports
    public function reports()
    {
        return $this->hasMany(Report::class);
    }
}
