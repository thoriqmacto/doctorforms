<?php

use App\Models\{Hospital, Patient, Report, Template, TemplateField, Test as TestModel, User};
use App\Models\ReportField;
use Laravel\Sanctum\Sanctum;

function makeListReportContext(): array
{
    $owner = User::factory()->create();
    $hospital = Hospital::create(['name' => 'List H '.uniqid(), 'address' => '1']);
    $test = TestModel::create([
        'code' => 'T'.uniqid(),
        'name' => 'Test '.uniqid(),
        'type' => 'blood',
    ]);
    $template = Template::create([
        'name'        => 'T '.uniqid(),
        'description' => 'desc',
        'user_id'     => $owner->id,
        'test_id'     => $test->id,
        'hospital_id' => $hospital->id,
        'is_enabled'  => true,
    ]);
    $patient = Patient::create([
        'user_id' => $owner->id,
        'hospital_id' => $hospital->id,
        'name' => 'Suhaicih Orin '.uniqid(),
        'age' => 40,
        'gender' => 'male',
        'mrn' => 'MRN'.uniqid(),
        'height_cm' => 170,
        'weight_kg' => 70,
    ]);

    return compact('owner', 'hospital', 'test', 'template', 'patient');
}

it('returns completion_percent based on filled template fields', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    Sanctum::actingAs($admin);

    $ctx = makeListReportContext();
    // 4 template fields, 1 filled => 25%
    $fields = collect(range(1, 4))->map(fn ($i) => TemplateField::create([
        'template_id' => $ctx['template']->id,
        'section'     => 'General',
        'label'       => "F{$i}",
        'type'        => 'text',
        'options'     => null,
        'order'       => $i,
        'field_group_order' => 0,
    ]));
    $report = Report::create([
        'user_id'     => $admin->id,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id'  => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id'     => $ctx['test']->id,
        'title'       => 'T',
    ]);
    ReportField::create([
        'report_id'         => $report->id,
        'template_field_id' => $fields->first()->id,
        'value'             => 'something',
    ]);

    $this->getJson('/api/v1/reports/'.$report->id)
        ->assertStatus(200)
        ->assertJsonPath('data.attributes.completion_percent', 25)
        ->assertJsonPath('data.attributes.is_completed', false);
});

it('mark complete forces completion_percent to 100 and sets completed_at', function () {
    $doctor = User::factory()->create(['role' => 'doctor']);
    Sanctum::actingAs($doctor);

    $ctx = makeListReportContext();
    $report = Report::create([
        'user_id'     => $doctor->id,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id'  => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id'     => $ctx['test']->id,
        'title'       => 'T',
    ]);

    $this->patchJson('/api/v1/reports/'.$report->id, ['is_completed' => true])
        ->assertStatus(200)
        ->assertJsonPath('data.attributes.is_completed', true)
        ->assertJsonPath('data.attributes.completion_percent', 100);

    expect($report->fresh()->completed_at)->not->toBeNull();

    // Re-opening clears completed_at.
    $this->patchJson('/api/v1/reports/'.$report->id, ['is_completed' => false])
        ->assertStatus(200)
        ->assertJsonPath('data.attributes.is_completed', false);

    expect($report->fresh()->completed_at)->toBeNull();
});

it('index supports filter.q matching patient and operator', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

    $ctx = makeListReportContext();
    Report::create([
        'user_id'     => $ctx['owner']->id,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id'  => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id'     => $ctx['test']->id,
        'title'       => 'AAA Specific Title',
        'operator'    => 'Dr Foo',
    ]);

    $response = $this->getJson('/api/v1/reports?filter.q=AAA%20Specific')
        ->assertStatus(200);
    $titles = collect($response->json('data'))->pluck('attributes.title')->all();
    expect($titles)->toContain('AAA Specific Title');

    $response = $this->getJson('/api/v1/reports?filter.q=Dr%20Foo')
        ->assertStatus(200);
    $titles = collect($response->json('data'))->pluck('attributes.title')->all();
    expect($titles)->toContain('AAA Specific Title');
});

it('index supports filter.is_completed', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

    $ctx = makeListReportContext();
    $open = Report::create([
        'user_id'     => $ctx['owner']->id,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id'  => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id'     => $ctx['test']->id,
        'title'       => 'open',
        'is_completed' => false,
    ]);
    $done = Report::create([
        'user_id'     => $ctx['owner']->id,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id'  => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id'     => $ctx['test']->id,
        'title'       => 'done',
        'is_completed' => true,
    ]);

    $ids = collect($this->getJson('/api/v1/reports?filter.is_completed=true')->json('data'))
        ->pluck('id')->map(fn ($id) => (int) $id)->all();
    expect($ids)->toContain($done->id)->not->toContain($open->id);
});

it('index supports sort by title', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

    $ctx = makeListReportContext();
    Report::create([
        'user_id'     => $ctx['owner']->id,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id'  => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id'     => $ctx['test']->id,
        'title'       => 'ZZZ later',
    ]);
    Report::create([
        'user_id'     => $ctx['owner']->id,
        'hospital_id' => $ctx['hospital']->id,
        'patient_id'  => $ctx['patient']->id,
        'template_id' => $ctx['template']->id,
        'test_id'     => $ctx['test']->id,
        'title'       => 'AAA earlier',
    ]);

    $titles = collect($this->getJson('/api/v1/reports?sort=title')->json('data'))
        ->pluck('attributes.title')->all();
    $a = array_search('AAA earlier', $titles, true);
    $z = array_search('ZZZ later', $titles, true);
    expect($a)->toBeLessThan($z);
});

it('patient index supports filter.q across name, mrn, hospital, user', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

    $doctor = User::factory()->create(['name' => 'Dr Aurora']);
    $hospital = Hospital::create(['name' => 'Hosp Borealis', 'address' => '1']);
    $patient = Patient::create([
        'user_id' => $doctor->id,
        'hospital_id' => $hospital->id,
        'name' => 'Unique Pat Name',
        'mrn' => 'UNIQUEMRN'.uniqid(),
        'age' => 30,
        'gender' => 'male',
        'height_cm' => 170,
        'weight_kg' => 70,
    ]);

    foreach (['Unique%20Pat', 'UNIQUEMRN', 'Aurora', 'Borealis'] as $needle) {
        $ids = collect($this->getJson('/api/v1/patients?filter.q='.$needle)->json('data'))
            ->pluck('id')->map(fn ($id) => (int) $id)->all();
        expect($ids)->toContain($patient->id);
    }
});
