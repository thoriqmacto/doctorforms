<?php

use App\Models\{Hospital, Patient, Template, Test as TestModel, User};
use Laravel\Sanctum\Sanctum;

function createTemplateRow(array $overrides = []): Template
{
    $owner = User::factory()->create();
    $hospital = Hospital::create(['name' => 'Hospital '.uniqid(), 'address' => '1']);
    $test = TestModel::create([
        'code' => 'T'.uniqid(),
        'name' => 'Test '.uniqid(),
        'type' => 'blood',
    ]);

    return Template::create(array_merge([
        'name'        => 'T '.uniqid(),
        'description' => 'desc',
        'user_id'     => $owner->id,
        'test_id'     => $test->id,
        'hospital_id' => $hospital->id,
        'is_enabled'  => true,
    ], $overrides));
}

it('admin sees both enabled and disabled templates in list', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

    $enabled = createTemplateRow(['is_enabled' => true]);
    $disabled = createTemplateRow(['is_enabled' => false]);

    $ids = collect($this->getJson('/api/v1/templates')->json('data'))
        ->pluck('id')
        ->map(fn ($id) => (int) $id)
        ->all();

    expect($ids)->toContain($enabled->id)->toContain($disabled->id);
});

it('non-admin sees only enabled templates in list', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'doctor']));

    $enabled = createTemplateRow(['is_enabled' => true]);
    $disabled = createTemplateRow(['is_enabled' => false]);

    $ids = collect($this->getJson('/api/v1/templates')->json('data'))
        ->pluck('id')
        ->map(fn ($id) => (int) $id)
        ->all();

    expect($ids)->toContain($enabled->id)->not->toContain($disabled->id);
});

it('non-admin cannot show a disabled template', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'doctor']));

    $disabled = createTemplateRow(['is_enabled' => false]);

    $this->getJson('/api/v1/templates/'.$disabled->id)
        ->assertStatus(403);
});

it('admin can show a disabled template', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

    $disabled = createTemplateRow(['is_enabled' => false]);

    $this->getJson('/api/v1/templates/'.$disabled->id)
        ->assertStatus(200)
        ->assertJsonPath('data.attributes.is_enabled', false);
});

it('rejects non-admin attempts to toggle is_enabled', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'doctor']));

    $template = createTemplateRow(['is_enabled' => true]);

    $this->patchJson('/api/v1/templates/'.$template->id, ['is_enabled' => false])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['is_enabled']);

    expect($template->fresh()->is_enabled)->toBeTrue();
});

it('rejects non-admin updates to a disabled template entirely', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'doctor']));

    $template = createTemplateRow(['is_enabled' => false]);

    $this->patchJson('/api/v1/templates/'.$template->id, ['name' => 'New Name'])
        ->assertStatus(403);
});

it('admin can toggle is_enabled', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

    $template = createTemplateRow(['is_enabled' => true]);

    $this->patchJson('/api/v1/templates/'.$template->id, ['is_enabled' => false])
        ->assertStatus(200)
        ->assertJsonPath('data.attributes.is_enabled', false);
});

it('blocks non-admin from creating a report with a disabled template', function () {
    $doctor = User::factory()->create(['role' => 'doctor']);
    Sanctum::actingAs($doctor);

    $template = createTemplateRow(['is_enabled' => false]);
    $patient = Patient::create([
        'user_id' => $doctor->id,
        'hospital_id' => $template->hospital_id,
        'name' => 'P',
        'age' => 30,
        'gender' => 'male',
        'mrn' => 'MRN'.uniqid(),
        'height_cm' => 170,
        'weight_kg' => 70,
    ]);

    $this->postJson('/api/v1/reports', [
        'title'       => 'New report',
        'user_id'     => $doctor->id,
        'hospital_id' => $template->hospital_id,
        'patient_id'  => $patient->id,
        'template_id' => $template->id,
        'test_id'     => $template->test_id,
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['template_id']);
});

it('allows admin to create a report with a disabled template', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    Sanctum::actingAs($admin);

    $template = createTemplateRow(['is_enabled' => false]);
    $patient = Patient::create([
        'user_id' => $admin->id,
        'hospital_id' => $template->hospital_id,
        'name' => 'P',
        'age' => 30,
        'gender' => 'male',
        'mrn' => 'MRN'.uniqid(),
        'height_cm' => 170,
        'weight_kg' => 70,
    ]);

    $this->postJson('/api/v1/reports', [
        'title'       => 'New report',
        'user_id'     => $admin->id,
        'hospital_id' => $template->hospital_id,
        'patient_id'  => $patient->id,
        'template_id' => $template->id,
        'test_id'     => $template->test_id,
    ])
        ->assertStatus(201);
});
