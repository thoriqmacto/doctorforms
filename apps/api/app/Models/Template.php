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
    ];

    // timestamps (created_at, updated_at)
    public $timestamps = true;

    // relations
    public function fields()
    {
        return $this->hasmany(TemplateField::class, 'template_id');
    }
}
