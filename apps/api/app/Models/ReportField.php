<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportField extends Model
{
    protected $table = 'report_fields';

    protected $fillable = [
        'report_id',
        'template_field_id',
        'value',
    ];

    public $timestamps = true;

    public function report()
    {
        return $this->belongsTo(Report::class);
    }

    public function templateField()
    {
        return $this->belongsTo(TemplateField::class);
    }
}

