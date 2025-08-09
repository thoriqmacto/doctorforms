<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Test extends Model
{
    protected $table = 'tests';

    protected $fillable = [
        'code',
        'name',
        'type',
        'description',
    ];

    public $timestamps = true;

    // Test has many templates (report templates)
    public function templates()
    {
        return $this->hasMany(Template::class);
    }

    // Test has many reports
    public function reports()
    {
        return $this->hasMany(Report::class);
    }
}
