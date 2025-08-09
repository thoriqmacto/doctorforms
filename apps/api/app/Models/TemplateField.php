<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TemplateField extends Model
{
    protected $table = 'template_fields';
    protected $fillable = [
        'template_id',
        'label',
        'type',
        'options',
        'section',
        'field_group_order',
        'order',
    ];

    public $timestamps = true;

    protected $casts = [
        'options' => 'array',   // to accommodate auto JSON cast
    ];

    public function template()
    {
        return $this->belongsTo(Template::class, 'template_id');
    }

    public function reportFields()
    {
        return $this->hasMany(ReportField::class);
    }
}
