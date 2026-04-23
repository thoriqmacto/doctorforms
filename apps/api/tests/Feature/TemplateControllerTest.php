<?php

use App\Models\{Template, TemplateField, User, Test, Hospital};
use App\Models\Patient;
use App\Models\Report;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
});

it('returns list of templates', function () {
    $user = User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'secret']);
    $test = Test::create(['code' => 'T1', 'name' => 'Test', 'type' => 'blood']);
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);

    Template::create([
        'name' => 'Sample Template',
        'description' => 'Desc',
        'user_id' => $user->id,
        'test_id' => $test->id,
        'hospital_id' => $hospital->id,
    ]);

    $response = $this->getJson('/api/v1/templates');

    $response->assertStatus(200)
        ->assertJsonPath('data.0.attributes.name', 'Sample Template');
});

it('shows a template', function () {
    $user = User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'secret']);
    $test = Test::create(['code' => 'T1', 'name' => 'Test', 'type' => 'blood']);
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);

    $template = Template::create([
        'name' => 'Sample Template',
        'description' => 'Desc',
        'user_id' => $user->id,
        'test_id' => $test->id,
        'hospital_id' => $hospital->id,
    ]);

    $response = $this->getJson('/api/v1/templates/'.$template->id);

    $response->assertStatus(200)
        ->assertJsonPath('data.attributes.name', 'Sample Template');
});

it('creates a template', function () {
    $user = User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'secret']);
    $test = Test::create(['code' => 'T1', 'name' => 'Test', 'type' => 'blood']);
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);

    $response = $this->postJson('/api/v1/templates', [
        'name' => 'New Template',
        'description' => 'Desc',
        'user_id' => $user->id,
        'test_id' => $test->id,
        'hospital_id' => $hospital->id,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.name', 'New Template');

    expect(Template::where('name', 'New Template')->exists())->toBeTrue();
});

it('updates a template', function () {
    $user = User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'secret']);
    $test = Test::create(['code' => 'T1', 'name' => 'Test', 'type' => 'blood']);
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);
    $template = Template::create([
        'name' => 'Sample Template',
        'description' => 'Desc',
        'user_id' => $user->id,
        'test_id' => $test->id,
        'hospital_id' => $hospital->id,
    ]);

    $response = $this->patchJson('/api/v1/templates/'.$template->id, [
        'name' => 'Updated Template',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.attributes.name', 'Updated Template');
});

it('deletes a template', function () {
    $user = User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'secret']);
    $test = Test::create(['code' => 'T1', 'name' => 'Test', 'type' => 'blood']);
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);
    $template = Template::create([
        'name' => 'Sample Template',
        'description' => 'Desc',
        'user_id' => $user->id,
        'test_id' => $test->id,
        'hospital_id' => $hospital->id,
    ]);

    $response = $this->deleteJson('/api/v1/templates/'.$template->id);

    $response->assertStatus(200);
    expect(Template::find($template->id))->toBeNull();
});

it('classifies grouped_sections with a stable kind used by the render plan', function () {
    $user = User::create(['name' => 'User', 'email' => 'kind@example.com', 'password' => 'secret']);
    $test = Test::create(['code' => 'T1', 'name' => 'Test', 'type' => 'blood']);
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);

    $template = Template::create([
        'name' => 'Sample Template',
        'description' => 'Desc',
        'user_id' => $user->id,
        'test_id' => $test->id,
        'hospital_id' => $hospital->id,
    ]);

    $sections = [
        ['section' => 'header', 'expected' => 'header'],
        ['section' => 'Measurements & Calculations', 'expected' => 'measurements'],
        ['section' => 'findings_01_Heart', 'expected' => 'findings'],
        ['section' => 'Conclusion', 'expected' => 'conclusion'],
        ['section' => 'Signature', 'expected' => 'signature'],
        ['section' => 'Study Info', 'expected' => 'general'],
    ];

    foreach ($sections as $idx => $entry) {
        TemplateField::create([
            'template_id' => $template->id,
            'section' => $entry['section'],
            'label' => 'Field '.$idx,
            'type' => 'text',
            'order' => $idx,
            'field_group_order' => $idx,
        ]);
    }

    $response = $this->getJson('/api/v1/templates/'.$template->id.'?include=fields');

    $response->assertStatus(200);
    $grouped = $response->json('data.meta.grouped_sections');

    $kindByName = collect($grouped)->mapWithKeys(fn ($g) => [$g['section'] => $g['kind']]);

    expect($kindByName['header'])->toBe('header')
        ->and($kindByName['Measurements & Calculations'])->toBe('measurements')
        ->and($kindByName['findings_01_Heart'])->toBe('findings')
        ->and($kindByName['Conclusion'])->toBe('conclusion')
        ->and($kindByName['Signature'])->toBe('signature')
        ->and($kindByName['Study Info'])->toBe('general');
});

it('round-trips header_config through create, show, and update', function () {
    $user = User::create(['name' => 'User', 'email' => 'hc@example.com', 'password' => 'secret']);
    $test = Test::create(['code' => 'T1', 'name' => 'Test', 'type' => 'blood']);
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);

    $headerConfig = [
        'layout' => 'three-col',
        'logo' => [
            'left' => [
                'binding' => ['source' => 'hospital', 'path' => 'logo_url'],
                'size' => 'lg',
                'visible' => true,
            ],
            'right' => [
                'binding' => ['source' => 'hospital', 'path' => 'secondary_logo_url'],
                'size' => 'lg',
                'visible' => false,
            ],
        ],
        'lines' => [
            [
                'binding' => ['source' => 'hospital', 'path' => 'name'],
                'font' => 'lg',
                'weight' => 'bold',
                'align' => 'center',
                'uppercase' => true,
            ],
            [
                'literal' => 'Transthoracic Echocardiography Report',
                'font' => 'md',
                'weight' => 'bold',
                'align' => 'center',
            ],
        ],
        'divider' => ['visible' => true, 'thicknessPt' => 0.75],
    ];

    $create = $this->postJson('/api/v1/templates', [
        'name' => 'With Header',
        'description' => 'Desc',
        'user_id' => $user->id,
        'test_id' => $test->id,
        'hospital_id' => $hospital->id,
        'header_config' => $headerConfig,
    ]);

    $create->assertStatus(201)
        ->assertJsonPath('data.attributes.header_config.layout', 'three-col')
        ->assertJsonPath('data.attributes.header_config.lines.0.binding.path', 'name');

    $templateId = $create->json('data.id');

    $this->getJson("/api/v1/templates/{$templateId}")
        ->assertStatus(200)
        ->assertJsonPath('data.attributes.header_config.lines.1.literal', 'Transthoracic Echocardiography Report');

    // Clear it — legacy fallback kicks in.
    $this->patchJson("/api/v1/templates/{$templateId}", [
        'header_config' => null,
    ])->assertStatus(200)
        ->assertJsonPath('data.attributes.header_config', null);
});

it('returns conflict when deleting a template with related reports', function () {
    $user = User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'secret']);
    $test = Test::create(['code' => 'T1', 'name' => 'Test', 'type' => 'blood']);
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);
    $patient = Patient::create([
        'user_id' => $user->id,
        'hospital_id' => $hospital->id,
        'name' => 'John Doe',
        'age' => 45,
        'dob' => '1980-01-01',
        'dos' => '2025-01-01',
        'gender' => 'male',
        'mrn' => 'MRN-1001',
        'height_cm' => 175,
        'weight_kg' => 78,
        'bsa' => 1.95,
        'blood_pressure' => '120/80',
        'referring_physician' => 'Dr. Smith',
        'diagnosis_brief' => 'Routine check',
    ]);

    $template = Template::create([
        'name' => 'Sample Template',
        'description' => 'Desc',
        'user_id' => $user->id,
        'test_id' => $test->id,
        'hospital_id' => $hospital->id,
    ]);

    $report = Report::create([
        'user_id' => $user->id,
        'hospital_id' => $hospital->id,
        'patient_id' => $patient->id,
        'template_id' => $template->id,
        'test_id' => $test->id,
        'title' => 'Echo Report',
    ]);

    $response = $this->deleteJson('/api/v1/templates/'.$template->id);

    $response->assertStatus(409)
        ->assertJsonPath('message', 'This template cannot be deleted because it is used by existing reports. Please delete all reports associated with this template first, then delete the template.')
        ->assertJsonPath('errors.0.status', '409')
        ->assertJsonPath('errors.0.title', 'Template deletion blocked by associated reports')
        ->assertJsonPath('errors.0.detail', 'Delete all reports associated with this template first, then delete the template.')
        ->assertJsonPath('errors.0.meta.related_reports_count', 1);

    expect(Template::find($template->id))->not->toBeNull()
        ->and(Report::find($report->id))->not->toBeNull();
});
