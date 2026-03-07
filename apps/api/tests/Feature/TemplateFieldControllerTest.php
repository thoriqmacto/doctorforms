<?php

use App\Models\{User, Hospital, Test as TestModel, Template};

it('creates template fields', function () {
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

    $response = $this->postJson('/api/v1/template-fields', [
        'template_id' => $template->id,
        'section' => 'Measurements',
        'label' => 'LV Size',
        'type' => 'text',
        'options' => ['default' => 'Normal'],
        'order' => 0,
        'field_group_order' => 0,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.label', 'LV Size')
        ->assertJsonPath('data.attributes.unique_name', 'measurements.lv_size')
        ->assertJsonPath('data.relationships.template.data.id', (string) $template->id);
});

it('updates unique_name when section or label changes', function () {
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

    $created = $this->postJson('/api/v1/template-fields', [
        'template_id' => $template->id,
        'section' => 'Header',
        'label' => 'Logo URL',
        'type' => 'text',
        'order' => 1,
        'field_group_order' => 1,
    ]);

    $created->assertStatus(201);
    $fieldId = $created->json('data.id');

    $this->patchJson("/api/v1/template-fields/{$fieldId}", [
        'section' => 'Footer',
        'label' => 'Contact Email',
    ])->assertStatus(200)
        ->assertJsonPath('data.attributes.unique_name', 'footer.contact_email');
});

it('requires measurement options for measurement type template fields', function () {
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

    $this->postJson('/api/v1/template-fields', [
        'template_id' => $template->id,
        'section' => 'Measurements',
        'label' => 'LVIDd',
        'type' => 'measurement',
        'options' => ['default' => '4.2'],
    ])->assertStatus(422)
        ->assertJsonValidationErrors([
            'options.measurement_name',
            'options.measurement_unit',
            'options.measurement_category',
        ]);
});

it('creates patient and user binding fields', function () {
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

    $this->postJson('/api/v1/template-fields', [
        'template_id' => $template->id,
        'section' => 'Patient',
        'label' => 'Patient Name',
        'type' => 'patient',
        'options' => ['default' => 'patients.name'],
    ])->assertStatus(201);

    $this->postJson('/api/v1/template-fields', [
        'template_id' => $template->id,
        'section' => 'User',
        'label' => 'Doctor Name',
        'type' => 'user',
        'options' => ['default' => 'users.name'],
    ])->assertStatus(201);
});
