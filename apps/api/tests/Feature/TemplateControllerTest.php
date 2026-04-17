<?php

use App\Models\{Template, User, Test, Hospital};
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
