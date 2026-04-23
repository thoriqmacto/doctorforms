<?php

use App\Models\{User, Hospital, Test as TestModel, Template};
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Sanctum::actingAs(User::factory()->create());
});

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

it('updates measurement fields when options payload is JSON string', function () {
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
        'section' => 'Measurements',
        'label' => 'LVIDd',
        'type' => 'measurement',
        'options' => [
            'default' => '4.2',
            'measurement_name' => 'LVIDd',
            'measurement_unit' => 'cm',
            'measurement_category' => 'lv',
        ],
        'order' => 1,
        'field_group_order' => 1,
    ]);

    $created->assertStatus(201);
    $fieldId = $created->json('data.id');

    $this->patchJson("/api/v1/template-fields/{$fieldId}", [
        'type' => 'measurement',
        'options' => json_encode([
            'default' => '4.3',
            'measurement_name' => 'LVIDd',
            'measurement_unit' => 'cm',
            'measurement_category' => 'lv',
        ]),
    ])->assertStatus(200)
        ->assertJsonPath('data.attributes.options.default', '4.3');
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

function makeTemplateForBindingTest(): Template
{
    $user = User::factory()->create();
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);
    $test = TestModel::create(['code' => 'TTE', 'name' => 'Echo', 'type' => 'ultrasound']);
    return Template::create([
        'name' => 'Echo Template',
        'description' => 'desc',
        'user_id' => $user->id,
        'test_id' => $test->id,
        'hospital_id' => $hospital->id,
    ]);
}

it('accepts a whitelisted options.binding for patient fields', function () {
    $template = makeTemplateForBindingTest();

    $this->postJson('/api/v1/template-fields', [
        'template_id' => $template->id,
        'section' => 'Patient',
        'label' => 'Date of Birth',
        'type' => 'patient',
        'options' => [
            'binding' => ['source' => 'patient', 'path' => 'dob'],
        ],
    ])->assertStatus(201)
        ->assertJsonPath('data.attributes.options.binding.source', 'patient')
        ->assertJsonPath('data.attributes.options.binding.path', 'dob');
});

it('rejects options.binding with an unknown source', function () {
    $template = makeTemplateForBindingTest();

    $this->postJson('/api/v1/template-fields', [
        'template_id' => $template->id,
        'section' => 'Patient',
        'label' => 'Anything',
        'type' => 'text',
        'options' => [
            'binding' => ['source' => 'aliens', 'path' => 'name'],
        ],
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['options.binding.source']);
});

it('rejects options.binding with a path not in the catalog', function () {
    $template = makeTemplateForBindingTest();

    $this->postJson('/api/v1/template-fields', [
        'template_id' => $template->id,
        'section' => 'Patient',
        'label' => 'Bogus',
        'type' => 'patient',
        'options' => [
            'binding' => ['source' => 'patient', 'path' => 'favourite_colour'],
        ],
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['options.binding.path']);
});

it('rejects a patient field whose binding source is not patient', function () {
    $template = makeTemplateForBindingTest();

    $this->postJson('/api/v1/template-fields', [
        'template_id' => $template->id,
        'section' => 'Patient',
        'label' => 'Wrong Source',
        'type' => 'patient',
        'options' => [
            'binding' => ['source' => 'hospital', 'path' => 'name'],
        ],
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['options.binding.source']);
});

it('accepts literal bindings with a value', function () {
    $template = makeTemplateForBindingTest();

    $this->postJson('/api/v1/template-fields', [
        'template_id' => $template->id,
        'section' => 'Header',
        'label' => 'Free text',
        'type' => 'text',
        'options' => [
            'binding' => ['source' => 'literal', 'value' => 'Laporan Echo'],
        ],
    ])->assertStatus(201);
});
