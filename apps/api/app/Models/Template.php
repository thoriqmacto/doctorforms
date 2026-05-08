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
        'department_id',
        'header_config',
        'layout_config',
    ];

    protected $casts = [
        // Structured header block definition. See HeaderConfig schema on the web side.
        'header_config' => 'array',
        'layout_config' => 'array',
    ];

    // timestamps (created_at, updated_at)
    public $timestamps = true;

    public function department()
    {
        return $this->belongsTo(HospitalDepartment::class, 'department_id');
    }

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

    /**
     * Instantiate a new report based on this template and populate
     * report fields with their default values.
     */
    public function instantiateReport(array $attributes): Report
    {
        $report = $this->reports()->create(array_merge([
            'template_id' => $this->id,
            'test_id'     => $this->test_id,
            'hospital_id' => $this->hospital_id,
        ], $attributes));

        $fieldsPayload = $this->fields()->get()->map(function (TemplateField $field) {
            $options = $field->options;
            $default = '';

            if (is_array($options) && array_key_exists('default', $options)) {
                $default = $options['default'];
            }

            return [
                'template_field_id' => $field->id,
                'value'             => $default,
            ];
        })->all();

        if (!empty($fieldsPayload)) {
            $report->fields()->createMany($fieldsPayload);
        }

        return $report;
    }
}
