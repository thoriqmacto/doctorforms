<?php

use App\Models\Template;
use App\Models\Test as TestModel;
use App\Models\User;
use App\Models\Hospital;
use App\Models\TemplateField;
use App\Models\Patient;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

test('template fillable includes user, test and hospital ids', function () {
    $template = new Template();
    expect($template->getFillable())->toContain('user_id')
        ->toContain('test_id')
        ->toContain('hospital_id');
});

test('template belongs to a user', function () {
    $template = new Template();
    expect($template->user())->toBeInstanceOf(BelongsTo::class)
        ->and($template->user()->getRelated())->toBeInstanceOf(User::class);
});

test('template belongs to a test', function () {
    $template = new Template();
    expect($template->test())->toBeInstanceOf(BelongsTo::class)
        ->and($template->test()->getRelated())->toBeInstanceOf(TestModel::class);
});

test('template belongs to a hospital', function () {
    $template = new Template();
    expect($template->hospital())->toBeInstanceOf(BelongsTo::class)
        ->and($template->hospital()->getRelated())->toBeInstanceOf(Hospital::class);
});

test('template can instantiate report with default field values', function () {
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
        'options' => ['default' => 'Normal'],
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
        'mrn' => 'MRN999',
        'height_cm' => 180,
        'weight_kg' => 80,
        'bsa' => 1.9,
        'blood_pressure' => '120/80',
        'referring_physician' => 'Dr. Smith',
        'diagnosis_brief' => 'Test diagnosis',
    ]);

    $report = $template->instantiateReport([
        'user_id' => $user->id,
        'patient_id' => $patient->id,
        'title' => 'Report 1',
    ]);

    expect($report->fields)->toHaveCount(1)
        ->and($report->fields->first()->value)->toBe('Normal');
});
