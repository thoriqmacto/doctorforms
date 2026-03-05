<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class TemplateField extends Model
{
    protected $table = 'template_fields';
    protected $fillable = [
        'template_id',
        'label',
        'unique_name',
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

    protected static function booted(): void
    {
        static::saving(function (self $templateField) {
            if (!$templateField->isDirty(['section', 'label']) && !blank($templateField->unique_name)) {
                return;
            }

            $templateField->unique_name = $templateField->resolveUniqueName();
        });
    }

    public function resolveUniqueName(): string
    {
        $section = Str::of($this->section ?? 'general')->lower()->slug('_')->value();
        $label = Str::of($this->label ?? 'field')->lower()->slug('_')->value();

        $section = $section !== '' ? $section : 'general';
        $label = $label !== '' ? $label : 'field';
        $base = "{$section}.{$label}";

        $uniqueName = $base;
        $suffix = 2;

        while (static::query()
            ->where('template_id', $this->template_id)
            ->where('unique_name', $uniqueName)
            ->when($this->exists, fn ($q) => $q->where('id', '!=', $this->id))
            ->exists()) {
            $uniqueName = "{$base}_{$suffix}";
            $suffix++;
        }

        return $uniqueName;
    }
}
