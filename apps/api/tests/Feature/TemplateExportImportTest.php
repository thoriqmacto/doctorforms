<?php

use App\Models\Hospital;
use App\Models\HospitalDepartment;
use App\Models\Template;
use App\Models\TemplateField;
use App\Models\Test as TestModel;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
});

function makeTemplateWithContext(array $overrides = []): array
{
    $user = User::factory()->create();
    $test = TestModel::create(['code' => 'TTE', 'name' => 'Echo', 'type' => 'ultrasound']);
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);

    $template = Template::create(array_merge([
        'name'          => 'Echo Template',
        'description'   => 'A template for echo reports.',
        'user_id'       => $user->id,
        'test_id'       => $test->id,
        'hospital_id'   => $hospital->id,
        'header_config' => ['layout' => 'centered', 'lines' => [['literal' => 'Test Report']]],
        'layout_config' => ['margins_mm' => ['top' => 10]],
    ], $overrides));

    return compact('user', 'test', 'hospital', 'template');
}

it('exports a template with fields and bindings in stable order', function () {
    ['template' => $template] = makeTemplateWithContext();

    // Two sections, fields intentionally out of insert order so we can verify the sort.
    TemplateField::create([
        'template_id' => $template->id,
        'section'     => 'Findings_01_Heart',
        'label'       => 'LV size',
        'type'        => 'text',
        'order'       => 1,
        'field_group_order' => 2,
    ]);
    TemplateField::create([
        'template_id' => $template->id,
        'section'     => 'Header',
        'label'       => 'Patient Name',
        'type'        => 'patient',
        'order'       => 0,
        'field_group_order' => 1,
        'options'     => [
            'binding' => ['source' => 'patient', 'path' => 'name'],
        ],
    ]);
    TemplateField::create([
        'template_id' => $template->id,
        'section'     => 'Findings_01_Heart',
        'label'       => 'EF',
        'type'        => 'number',
        'order'       => 0,
        'field_group_order' => 2,
    ]);

    $response = $this->getJson('/api/v1/templates/'.$template->id.'/export');

    $response->assertStatus(200)
        ->assertJsonPath('version', 'TemplateExportV1')
        ->assertJsonPath('template.name', 'Echo Template')
        ->assertJsonPath('template.header_config.layout', 'centered')
        ->assertJsonPath('template.layout_config.margins_mm.top', 10)
        ->assertJsonPath('template.hospital_id', $template->hospital_id);

    $fields = $response->json('fields');
    expect($fields)->toHaveCount(3);

    // Sort key: (field_group_order, order, id). So the Header field (1,0) comes
    // first, then Findings EF (2,0), then Findings LV size (2,1).
    expect($fields[0]['label'])->toBe('Patient Name');
    expect($fields[1]['label'])->toBe('EF');
    expect($fields[2]['label'])->toBe('LV size');

    expect($fields[0]['options']['binding']['source'])->toBe('patient');

    $sections = $response->json('sections');
    expect(array_column($sections, 'name'))->toBe(['Header', 'Findings_01_Heart']);
    expect($sections[0]['kind'])->toBe('header');
    expect($sections[1]['kind'])->toBe('findings');
});

it('round-trips a template via export then import', function () {
    ['template' => $template] = makeTemplateWithContext();

    TemplateField::create([
        'template_id' => $template->id,
        'section'     => 'Header',
        'label'       => 'Patient Name',
        'type'        => 'patient',
        'order'       => 0,
        'field_group_order' => 1,
        'options'     => ['binding' => ['source' => 'patient', 'path' => 'name']],
    ]);
    TemplateField::create([
        'template_id' => $template->id,
        'section'     => 'Findings_01_Heart',
        'label'       => 'LV size',
        'type'        => 'text',
        'order'       => 0,
        'field_group_order' => 2,
    ]);

    $exportPayload = $this->getJson('/api/v1/templates/'.$template->id.'/export')
        ->assertStatus(200)
        ->json();

    $templatesBefore = Template::count();

    $imported = $this->postJson('/api/v1/templates/import', $exportPayload)
        ->assertStatus(201)
        ->assertJsonPath('data.attributes.name', 'Echo Template')
        // Imported templates start disabled — admins publish explicitly.
        ->assertJsonPath('data.attributes.is_enabled', false)
        ->json();

    expect(Template::count())->toBe($templatesBefore + 1);

    $newTemplateId = $imported['data']['id'];
    expect((int) $newTemplateId)->not->toBe($template->id);

    $fields = TemplateField::where('template_id', $newTemplateId)
        ->orderBy('field_group_order')->orderBy('order')->orderBy('id')
        ->get();
    expect($fields)->toHaveCount(2);
    expect($fields[0]->label)->toBe('Patient Name');
    expect($fields[0]->options['binding']['path'])->toBe('name');
    expect($fields[1]->label)->toBe('LV size');
});

it('rejects an import with a missing version field', function () {
    ['user' => $user, 'test' => $test, 'hospital' => $hospital] = makeTemplateWithContext();

    $payload = [
        'template' => [
            'name'        => 'No Version',
            'user_id'     => $user->id,
            'test_id'     => $test->id,
            'hospital_id' => $hospital->id,
        ],
        'fields' => [],
    ];

    $this->postJson('/api/v1/templates/import', $payload)
        ->assertStatus(422)
        ->assertJsonValidationErrors(['version']);
});

it('rejects an import with an unrecognized binding path and writes nothing', function () {
    ['user' => $user, 'test' => $test, 'hospital' => $hospital] = makeTemplateWithContext();

    $templatesBefore = Template::count();
    $fieldsBefore = TemplateField::count();

    $payload = [
        'version'  => 'TemplateExportV1',
        'template' => [
            'name'        => 'Bad Binding',
            'user_id'     => $user->id,
            'test_id'     => $test->id,
            'hospital_id' => $hospital->id,
        ],
        'sections' => [['name' => 'Header', 'kind' => 'header']],
        'fields' => [[
            'section' => 'Header',
            'label'   => 'Bogus',
            'type'    => 'text',
            'order'   => 0,
            'field_group_order' => 0,
            'options' => ['binding' => ['source' => 'patient', 'path' => 'not_a_real_path']],
        ]],
    ];

    $this->postJson('/api/v1/templates/import', $payload)->assertStatus(422);

    // Transactional rollback: nothing persisted.
    expect(Template::count())->toBe($templatesBefore);
    expect(TemplateField::count())->toBe($fieldsBefore);
});

it('requires user_id, test_id, and hospital_id on import', function () {
    $payload = [
        'version'  => 'TemplateExportV1',
        'template' => ['name' => 'Missing FKs'],
        'fields'   => [],
    ];

    $this->postJson('/api/v1/templates/import', $payload)
        ->assertStatus(422)
        ->assertJsonValidationErrors([
            'template.user_id',
            'template.test_id',
            'template.hospital_id',
        ]);
});

it('rejects an import where a foreign key does not exist in the target db', function () {
    $payload = [
        'version'  => 'TemplateExportV1',
        'template' => [
            'name'        => 'Stale IDs',
            'user_id'     => 999999,
            'test_id'     => 999999,
            'hospital_id' => 999999,
        ],
        'fields' => [],
    ];

    $this->postJson('/api/v1/templates/import', $payload)
        ->assertStatus(422)
        ->assertJsonValidationErrors([
            'template.user_id',
            'template.test_id',
            'template.hospital_id',
        ]);
});
