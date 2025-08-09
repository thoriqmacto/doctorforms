<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Measurement extends Model
{
    protected $table = 'measurements';

    protected $fillable = [
        'report_id',
        'name',
        'value',
        'unit',
        'category',
    ];

    public $timestamps = true;

    public function report()
    {
        return $this->belongsTo(Report::class);
    }
}

