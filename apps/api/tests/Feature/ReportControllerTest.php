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

it('creates a report with fields and measurements', function () {
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
        'mrn' => 'MRN124',
        'height_cm' => 180,
        'weight_kg' => 80,
        'bsa' => 1.9,
        'blood_pressure' => '120/80',
        'referring_physician' => 'Dr. Smith',
        'diagnosis_brief' => 'Test diagnosis',
    ]);

    $payload = [
        'user_id' => $user->id,
        'hospital_id' => $hospital->id,
        'patient_id' => $patient->id,
        'template_id' => $template->id,
        'test_id' => $test->id,
        'title' => 'Report 2',
        'findings' => 'All good',
        'conclusion' => 'Normal',
        'operator' => 'Operator',
        'supervisor' => 'Supervisor',
        'device' => 'Device',
        'fields' => [
            ['template_field_id' => $templateField->id, 'value' => 'Normal'],
        ],
        'measurements' => [
            ['name' => 'LVIDd', 'value' => '5.2', 'unit' => 'cm', 'category' => 'LV'],
        ],
    ];

    $response = $this->postJson('/api/v1/reports', $payload);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.title', 'Report 2')
        ->assertJsonPath('data.relationships.fields.data.0.value', 'Normal')
        ->assertJsonPath('data.relationships.measurements.data.0.attributes.name', 'LVIDd');
});

it('updates a report and its related data', function () {
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
        'mrn' => 'MRN125',
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
        'title' => 'Report 3',
        'findings' => 'All good',
        'conclusion' => 'Normal',
        'operator' => 'Operator',
        'supervisor' => 'Supervisor',
        'device' => 'Device',
    ]);
    ReportField::create([
        'report_id' => $report->id,
        'template_field_id' => $templateField->id,
        'value' => 'Old',
    ]);
    Measurement::create([
        'report_id' => $report->id,
        'name' => 'LVIDd',
        'value' => '5.2',
        'unit' => 'cm',
        'category' => 'LV',
    ]);

    $payload = [
        'title' => 'Updated Report',
        'fields' => [
            ['template_field_id' => $templateField->id, 'value' => 'Updated'],
        ],
        'measurements' => [
            ['name' => 'LVIDs', 'value' => '3.1', 'unit' => 'cm', 'category' => 'LV'],
        ],
    ];

    $response = $this->patchJson('/api/v1/reports/'.$report->id, $payload);

    $response->assertStatus(200)
        ->assertJsonPath('data.attributes.title', 'Updated Report')
        ->assertJsonPath('data.relationships.fields.data.0.value', 'Updated')
        ->assertJsonPath('data.relationships.measurements.data.0.attributes.name', 'LVIDs');
});

it('deletes a report', function () {
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
    $patient = Patient::create([
        'user_id' => $user->id,
        'hospital_id' => $hospital->id,
        'name' => 'John Doe',
        'age' => 55,
        'dob' => '1970-01-01',
        'dos' => '2024-01-01',
        'gender' => 'male',
        'mrn' => 'MRN126',
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
        'title' => 'Report 4',
        'findings' => 'All good',
        'conclusion' => 'Normal',
        'operator' => 'Operator',
        'supervisor' => 'Supervisor',
        'device' => 'Device',
    ]);

    $response = $this->deleteJson('/api/v1/reports/'.$report->id);

    $response->assertStatus(200)
        ->assertJsonPath('meta.status', 'deleted');
});
