<?php

use App\Models\Hospital;
use App\Models\Template;
use App\Models\TemplateField;
use App\Models\Test as TestModel;
use App\Models\User;

it('upserts template fields from a json object payload', function () {
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

    $path = storage_path('framework/testing/template-field-single.json');
    file_put_contents($path, json_encode([
        'template_id' => $template->id,
        'section' => 'Findings_11_TV',
        'label' => '*Stenosis_List',
        'type' => 'checkbox_group',
        'order' => 4,
        'field_group_order' => 14,
        'options' => [
            'required' => false,
            'static' => false,
            'values' => [
                'There is no tricuspid stenosis.',
                'There is non significant tricuspid stenosis.',
                'There is significant tricuspid stenosis.',
            ],
        ],
    ], JSON_PRETTY_PRINT));

    $this->artisan('template-fields:upsert-json', ['path' => $path])
        ->expectsOutputToContain('Created: 1')
        ->assertExitCode(0);

    expect(TemplateField::query()->where([
        'template_id' => $template->id,
        'section' => 'Findings_11_TV',
        'label' => '*Stenosis_List',
    ])->exists())->toBeTrue();

    @unlink($path);
});

it('updates existing template fields when the json row already exists', function () {
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

    TemplateField::create([
        'template_id' => $template->id,
        'section' => 'Findings_11_TV',
        'label' => '*Stenosis_List',
        'type' => 'checkbox_group',
        'order' => 1,
        'field_group_order' => 1,
        'options' => ['values' => ['old option']],
    ]);

    $path = storage_path('framework/testing/template-field-array.json');
    file_put_contents($path, json_encode([[
        'template_id' => $template->id,
        'section' => 'Findings_11_TV',
        'label' => '*Stenosis_List',
        'type' => 'checkbox_group',
        'order' => 4,
        'field_group_order' => 14,
        'options' => ['values' => ['new option']],
    ]], JSON_PRETTY_PRINT));

    $this->artisan('template-fields:upsert-json', ['path' => $path])
        ->expectsOutputToContain('Updated: 1')
        ->assertExitCode(0);

    $field = TemplateField::query()->where([
        'template_id' => $template->id,
        'section' => 'Findings_11_TV',
        'label' => '*Stenosis_List',
    ])->firstOrFail();

    expect($field->order)->toBe(4)
        ->and($field->field_group_order)->toBe(14)
        ->and($field->options['values'])->toBe(['new option']);

    @unlink($path);
});
