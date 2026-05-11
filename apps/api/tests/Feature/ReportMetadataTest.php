<?php

use App\Models\{Hospital, Patient, Report, Template, Test as TestModel, User};
use Laravel\Sanctum\Sanctum;

function makeReportContext(array $templateOverrides = []): array
{
    $owner = User::factory()->create();
    $hospital = Hospital::create(['name' => 'Hospital '.uniqid(), 'address' => '1']);
    $test = TestModel::create([
        'code' => 'T'.uniqid(),
        'name' => 'Test '.uniqid(),
        'type' => 'blood',
    ]);
    $template = Template::create(array_merge([
        'name'        => 'T '.uniqid(),
        'description' => 'desc',
        'user_id'     => $owner->id,
        'test_id'     => $test->id,
        'hospital_id' => $hospital->id,
        'is_enabled'  => true,
    ], $templateOverrides));
    $patient = Patient::create([
        'user_id' => $owner->id,
        'hospital_id' => $hospital->id,
        'name' => 'Suhaicih Orin',
        'age' => 40,
        'gender' => 'male',
        'mrn' => 'MRN'.uniqid(),
        'height_cm' => 170,
        'weight_kg' => 70,
    ]);

    return compact('owner', 'hospital', 'test', 'template', 'patient');
}

it('defaults operator to the authenticated user name on store', function () {
    $doctor = User::factory()->create(['role' => 'doctor', 'name' => 'Dr Alice']);
    Sanctum::actingAs($doctor);

    $ctx = makeReportContext();

    $response = $this->postJson('/api/v1/reports', [
        'title'       => 'TTE Report - Suhaicih Orin',
        'user_id'     => $doctor->id,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id'  => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id'     => $ctx['test']->id,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.operator', 'Dr Alice')
        ->assertJsonPath('data.attributes.title', 'TTE Report - Suhaicih Orin');
});

it('does not overwrite an explicitly provided operator on store', function () {
    $doctor = User::factory()->create(['role' => 'doctor', 'name' => 'Dr Alice']);
    Sanctum::actingAs($doctor);

    $ctx = makeReportContext();

    $this->postJson('/api/v1/reports', [
        'title'       => 'TTE Report - Suhaicih Orin',
        'operator'    => 'Custom Operator',
        'user_id'     => $doctor->id,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id'  => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id'     => $ctx['test']->id,
    ])
        ->assertStatus(201)
        ->assertJsonPath('data.attributes.operator', 'Custom Operator');
});

it('lets non-admin users edit metadata fields on an existing report', function () {
    $doctor = User::factory()->create(['role' => 'doctor', 'name' => 'Dr Alice']);
    Sanctum::actingAs($doctor);

    $ctx = makeReportContext();
    $report = Report::create([
        'user_id'     => $doctor->id,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id'  => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id'     => $ctx['test']->id,
        'title'       => 'Initial title',
        'operator'    => 'Dr Alice',
    ]);

    $this->patchJson('/api/v1/reports/'.$report->id, [
        'title'      => 'Edited title',
        'operator'   => 'Dr Bob',
        'supervisor' => 'Dr Sup',
        'device'     => 'GE Vivid',
    ])
        ->assertStatus(200)
        ->assertJsonPath('data.attributes.title', 'Edited title')
        ->assertJsonPath('data.attributes.operator', 'Dr Bob')
        ->assertJsonPath('data.attributes.supervisor', 'Dr Sup')
        ->assertJsonPath('data.attributes.device', 'GE Vivid');
});

it('blocks non-admin from changing relationship FKs on update', function () {
    $doctor = User::factory()->create(['role' => 'doctor']);
    Sanctum::actingAs($doctor);

    $ctx = makeReportContext();
    $report = Report::create([
        'user_id'     => $doctor->id,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id'  => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id'     => $ctx['test']->id,
        'title'       => 'T',
    ]);

    $otherCtx = makeReportContext();

    foreach (['patient_id', 'template_id', 'test_id', 'hospital_id'] as $key) {
        $payload = [$key => $otherCtx[$key === 'patient_id' ? 'patient' : ($key === 'template_id' ? 'template' : ($key === 'test_id' ? 'test' : 'hospital'))]->id];
        $this->patchJson('/api/v1/reports/'.$report->id, $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors([$key]);
    }
});

it('allows admin to change relationship FKs on update', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    Sanctum::actingAs($admin);

    $ctx = makeReportContext();
    $report = Report::create([
        'user_id'     => $admin->id,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id'  => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id'     => $ctx['test']->id,
        'title'       => 'T',
    ]);

    $otherCtx = makeReportContext();

    $this->patchJson('/api/v1/reports/'.$report->id, [
        'patient_id'  => $otherCtx['patient']->id,
        'template_id' => $otherCtx['template']->id,
        'test_id'     => $otherCtx['test']->id,
        'hospital_id' => $otherCtx['hospital']->id,
    ])->assertStatus(200);
});

it('keeps existing reports against now-disabled templates editable for non-admin metadata edits', function () {
    $doctor = User::factory()->create(['role' => 'doctor', 'name' => 'Dr Alice']);
    Sanctum::actingAs($doctor);

    $ctx = makeReportContext();
    $report = Report::create([
        'user_id'     => $doctor->id,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id'  => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id'     => $ctx['test']->id,
        'title'       => 'T',
    ]);

    // Admin disables the template after the report exists.
    $ctx['template']->update(['is_enabled' => false]);

    // Non-admin can still edit metadata because no template_id is sent.
    $this->patchJson('/api/v1/reports/'.$report->id, [
        'title' => 'Edited after template disable',
    ])
        ->assertStatus(200)
        ->assertJsonPath('data.attributes.title', 'Edited after template disable');
});

it('forces non-admin report ownership to authenticated user on create without user_id', function () {
    $doctor = User::factory()->create(['role' => 'doctor']);
    Sanctum::actingAs($doctor);

    $ctx = makeReportContext();

    $this->postJson('/api/v1/reports', [
        'title' => 'Owned by creator',
        'hospital_id' => $ctx['hospital']->id,
        'patient_id' => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id' => $ctx['test']->id,
    ])->assertStatus(201)
      ->assertJsonPath('data.relationships.user.data.id', (string) $doctor->id);
});

it('ignores spoofed user_id for non-admin report create', function () {
    $doctor = User::factory()->create(['role' => 'doctor']);
    $other = User::factory()->create();
    Sanctum::actingAs($doctor);

    $ctx = makeReportContext();

    $this->postJson('/api/v1/reports', [
        'title' => 'Owned by creator',
        'user_id' => $other->id,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id' => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id' => $ctx['test']->id,
    ])->assertStatus(201)
      ->assertJsonPath('data.relationships.user.data.id', (string) $doctor->id);
});

it('defaults admin report ownership to admin on create without user_id', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    Sanctum::actingAs($admin);

    $ctx = makeReportContext();

    $this->postJson('/api/v1/reports', [
        'title' => 'Admin owned',
        'hospital_id' => $ctx['hospital']->id,
        'patient_id' => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id' => $ctx['test']->id,
    ])->assertStatus(201)
      ->assertJsonPath('data.relationships.user.data.id', (string) $admin->id);
});

it('allows admin to set explicit owner on create and reassign on update', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $ownerA = User::factory()->create();
    $ownerB = User::factory()->create();
    Sanctum::actingAs($admin);

    $ctx = makeReportContext();

    $create = $this->postJson('/api/v1/reports', [
        'title' => 'Admin assigned',
        'user_id' => $ownerA->id,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id' => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id' => $ctx['test']->id,
    ])->assertStatus(201)
      ->assertJsonPath('data.relationships.user.data.id', (string) $ownerA->id);

    $id = $create->json('data.id');

    $this->patchJson('/api/v1/reports/'.$id, ['user_id' => $ownerB->id])
        ->assertStatus(200)
        ->assertJsonPath('data.relationships.user.data.id', (string) $ownerB->id);
});

it('allows admin to assign previously unassigned report and non-admin cannot change owner', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $doctor = User::factory()->create(['role' => 'doctor']);
    $targetOwner = User::factory()->create();

    $ctx = makeReportContext();
    $report = Report::create([
        'user_id' => null,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id' => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id' => $ctx['test']->id,
        'title' => 'Legacy unassigned',
    ]);

    Sanctum::actingAs($admin);
    $this->patchJson('/api/v1/reports/'.$report->id, ['user_id' => $targetOwner->id])
        ->assertStatus(200)
        ->assertJsonPath('data.relationships.user.data.id', (string) $targetOwner->id);

    Sanctum::actingAs($doctor);
    $this->patchJson('/api/v1/reports/'.$report->id, ['user_id' => $doctor->id])
        ->assertStatus(422)
        ->assertJsonPath('errors.user_id.0', 'Only an administrator can change report ownership.');
});

it('keeps unassigned reports readable and returns null user relationship', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    Sanctum::actingAs($admin);

    $ctx = makeReportContext();
    $report = Report::create([
        'user_id' => null,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id' => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id' => $ctx['test']->id,
        'title' => 'Legacy unassigned',
    ]);

    $this->getJson('/api/v1/reports/'.$report->id)
        ->assertStatus(200)
        ->assertJsonPath('data.relationships.user.data', null);

    $this->patchJson('/api/v1/reports/'.$report->id, ['title' => 'Still editable'])
        ->assertStatus(200)
        ->assertJsonPath('data.attributes.title', 'Still editable');
});
