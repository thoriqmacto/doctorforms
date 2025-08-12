<?php

use App\Models\{User, Hospital, Test as TestModel, Template, TemplateField, Patient, Report, ReportField, Measurement};

it('returns reports with attributes, relationships and fields', function () {
    $user = User::factory()->create();
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);
    $test = TestModel::create(['code' => 'TTE', 'name' => 'Echo', 'type' => 'ultrasound']);
    $template = Template::create([
        'name' => 'Echo Template',
        'description' => 'desc',
        'user_id' => $user->id,
        'test_id' => $test->id,
        'hospital_id' => $hospital->id,
    ]);
    $templateField = TemplateField::create([
        'template_id' => $template->id,
        'section' => 'Measurements',
        'label' => 'LV Size',
        'type' => 'text',
        'options' => null,
        'order' => 0,
        'field_group_order' => 0,
    ]);
    $patient = Patient::create([
        'user_id' => $user->id,
        'hospital_id' => $hospital->id,
        'name' => 'John Doe',
        'age' => 55,
        'dob' => '1970-01-01',
        'dos' => '2024-01-01',
        'gender' => 'male',
        'mrn' => 'MRN123',
        'height_cm' => 180,
        'weight_kg' => 80,
        'bsa' => 1.9,
        'blood_pressure' => '120/80',
        'referring_physician' => 'Dr. Smith',
        'diagnosis_brief' => 'Test diagnosis',
    ]);
    $report = Report::create([
        'user_id' => $user->id,
        'hospital_id' => $hospital->id,
        'patient_id' => $patient->id,
        'template_id' => $template->id,
        'test_id' => $test->id,
        'title' => 'Report 1',
        'findings' => 'All good',
        'conclusion' => 'Normal',
        'operator' => 'Operator',
        'supervisor' => 'Supervisor',
        'device' => 'Device',
        'pdf_url' => null,
    ]);
    ReportField::create([
        'report_id' => $report->id,
        'template_field_id' => $templateField->id,
        'value' => 'Normal',
    ]);
    Measurement::create([
        'report_id' => $report->id,
        'name' => 'LVIDd',
        'value' => '5.2',
        'unit' => 'cm',
        'category' => 'LV',
    ]);

    $indexResponse = $this->getJson('/api/v1/reports');
    $indexResponse->assertStatus(200)
        ->assertJsonPath('data.0.attributes.title', 'Report 1')
        ->assertJsonPath('data.0.relationships.patient.data.id', (string) $patient->id)
        ->assertJsonPath('data.0.relationships.fields.data.0.label', 'LV Size')
        ->assertJsonPath('data.0.relationships.fields.data.0.value', 'Normal')
        ->assertJsonPath('data.0.relationships.measurements.data.0.attributes.name', 'LVIDd');

    $showResponse = $this->getJson('/api/v1/reports/'.$report->id);
    $showResponse->assertStatus(200)
        ->assertJsonPath('data.attributes.title', 'Report 1')
        ->assertJsonPath('data.relationships.patient.data.id', (string) $patient->id)
        ->assertJsonPath('data.relationships.fields.data.0.label', 'LV Size')
        ->assertJsonPath('data.relationships.measurements.data.0.attributes.name', 'LVIDd');
});
