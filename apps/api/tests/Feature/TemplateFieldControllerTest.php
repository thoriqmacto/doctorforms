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
        ->assertJsonPath('data.relationships.template.data.id', (string) $template->id);
});

