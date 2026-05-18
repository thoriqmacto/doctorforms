<?php

use App\Models\Hospital;
use App\Models\Patient;
use App\Models\Report;
use App\Models\Template;
use App\Models\Test as TestModel;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'doctor']));
});

function csvFixture(array $rows): UploadedFile
{
    $path = tempnam(sys_get_temp_dir(), 'csv-fixture-').'.csv';
    $handle = fopen($path, 'w');
    foreach ($rows as $row) {
        fputcsv($handle, $row);
    }
    fclose($handle);

    return new UploadedFile($path, 'patients.csv', 'text/csv', null, true);
}

function seedPatientWorld(): array
{
    $hospital = Hospital::create(['name' => 'Test Hospital', 'address' => 'Addr']);
    $user = User::factory()->create(['role' => 'doctor']);

    return compact('hospital', 'user');
}

it('exports patients and reports as a zip bundle with the expected sheets', function () {
    ['hospital' => $hospital, 'user' => $user] = seedPatientWorld();

    $patient = Patient::create([
        'mrn'         => 'EXP-001',
        'name'        => 'Alice',
        'gender'      => 'female',
        'hospital_id' => $hospital->id,
        'user_id'     => $user->id,
    ]);
    $patient2 = Patient::create([
        'mrn'         => 'EXP-002',
        'name'        => 'Bob',
        'gender'      => 'male',
        'hospital_id' => $hospital->id,
        'user_id'     => $user->id,
    ]);

    $test = TestModel::create(['code' => 'TTE', 'name' => 'Echo', 'type' => 'ultrasound']);
    $template = Template::create([
        'name'        => 'Echo Template',
        'description' => '',
        'user_id'     => $user->id,
        'test_id'     => $test->id,
        'hospital_id' => $hospital->id,
    ]);
    Report::create([
        'title'       => 'Alice Echo',
        'user_id'     => $user->id,
        'patient_id'  => $patient->id,
        'hospital_id' => $hospital->id,
        'template_id' => $template->id,
        'test_id'     => $test->id,
    ]);

    $response = $this->get('/api/v1/patients/export');
    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'application/zip');

    $zipPath = $response->getFile()->getPathname();
    expect(filesize($zipPath))->toBeGreaterThan(0);

    $zip = new ZipArchive();
    expect($zip->open($zipPath))->toBe(true);

    $patientsCsv = $zip->getFromName('patients.csv');
    $reportsCsv = $zip->getFromName('reports.csv');
    $zip->close();

    expect($patientsCsv)->toBeString();
    expect($reportsCsv)->toBeString();

    expect($patientsCsv)->toContain('mrn,name,gender,hospital_id,user_id');
    expect($patientsCsv)->toContain('EXP-001,Alice,female');
    expect($patientsCsv)->toContain('EXP-002,Bob,male');

    expect($reportsCsv)->toContain('report_id,title,patient_id,patient_mrn');
    expect($reportsCsv)->toContain('Alice Echo');
    expect($reportsCsv)->toContain('EXP-001');
});

it('export respects the same filter scope as the index endpoint', function () {
    ['hospital' => $hospital, 'user' => $user] = seedPatientWorld();

    Patient::create([
        'mrn' => 'FILTER-NEEDLE', 'name' => 'Findable',
        'gender' => 'male', 'hospital_id' => $hospital->id, 'user_id' => $user->id,
    ]);
    Patient::create([
        'mrn' => 'FILTER-OTHER', 'name' => 'Hidden',
        'gender' => 'male', 'hospital_id' => $hospital->id, 'user_id' => $user->id,
    ]);

    $response = $this->get('/api/v1/patients/export?filter[mrn]=NEEDLE');
    $response->assertStatus(200);

    $zipPath = $response->getFile()->getPathname();
    $zip = new ZipArchive();
    $zip->open($zipPath);
    $patientsCsv = $zip->getFromName('patients.csv');
    $zip->close();

    expect($patientsCsv)->toContain('FILTER-NEEDLE');
    expect($patientsCsv)->not->toContain('FILTER-OTHER');
});

it('imports valid rows and returns a summary', function () {
    ['hospital' => $hospital, 'user' => $user] = seedPatientWorld();

    $file = csvFixture([
        ['mrn', 'name', 'gender', 'hospital_id', 'user_id'],
        ['IMP-001', 'Patient One',  'male',   $hospital->id, $user->id],
        ['IMP-002', 'Patient Two',  'female', $hospital->id, $user->id],
        ['IMP-003', 'Patient Three','male',   $hospital->id, $user->id],
    ]);

    $response = $this->postJson('/api/v1/patients/import', ['file' => $file]);

    $response->assertStatus(200)
        ->assertJsonPath('data.total', 3)
        ->assertJsonPath('data.succeeded', 3)
        ->assertJsonPath('data.failed', 0)
        ->assertJsonPath('data.created', 3)
        ->assertJsonPath('data.updated', 0);

    expect(Patient::where('mrn', 'IMP-001')->exists())->toBeTrue();
    expect(Patient::where('mrn', 'IMP-002')->exists())->toBeTrue();
    expect(Patient::where('mrn', 'IMP-003')->exists())->toBeTrue();
});

it('upserts by (mrn, hospital_id) and updates existing patients', function () {
    ['hospital' => $hospital, 'user' => $user] = seedPatientWorld();

    Patient::create([
        'mrn' => 'UPS-001',
        'name' => 'Original',
        'gender' => 'male',
        'hospital_id' => $hospital->id,
        'user_id' => $user->id,
    ]);

    $file = csvFixture([
        ['mrn', 'name', 'gender', 'hospital_id', 'user_id'],
        ['UPS-001', 'Updated Name', 'female', $hospital->id, $user->id],
    ]);

    $response = $this->postJson('/api/v1/patients/import', ['file' => $file]);

    $response->assertStatus(200)
        ->assertJsonPath('data.created', 0)
        ->assertJsonPath('data.updated', 1);

    $patient = Patient::where('mrn', 'UPS-001')->first();
    expect($patient->name)->toBe('Updated Name');
    expect($patient->gender)->toBe('female');
});

it('treats same MRN at a different hospital as a separate patient', function () {
    ['hospital' => $hospitalA, 'user' => $user] = seedPatientWorld();
    $hospitalB = Hospital::create(['name' => 'Other Hospital', 'address' => 'Other']);

    Patient::create([
        'mrn' => 'MRN-COLLISION',
        'name' => 'At Hospital A',
        'gender' => 'male',
        'hospital_id' => $hospitalA->id,
        'user_id' => $user->id,
    ]);

    $file = csvFixture([
        ['mrn', 'name', 'gender', 'hospital_id', 'user_id'],
        ['MRN-COLLISION', 'At Hospital B', 'male', $hospitalB->id, $user->id],
    ]);

    $response = $this->postJson('/api/v1/patients/import', ['file' => $file]);
    $response->assertStatus(200)
        ->assertJsonPath('data.created', 1)
        ->assertJsonPath('data.updated', 0);

    expect(Patient::where('mrn', 'MRN-COLLISION')->count())->toBe(2);
});

it('returns per-row errors for invalid rows without aborting the whole file', function () {
    ['hospital' => $hospital, 'user' => $user] = seedPatientWorld();

    $file = csvFixture([
        ['mrn', 'name', 'gender', 'hospital_id', 'user_id'],
        ['OK-001', 'Good Row',    'male',   $hospital->id, $user->id],
        ['',       'Missing MRN', 'female', $hospital->id, $user->id],
        ['OK-002', 'Bad Gender',  'other',  $hospital->id, $user->id],
        ['OK-003', 'Last Good',   'female', $hospital->id, $user->id],
    ]);

    $response = $this->postJson('/api/v1/patients/import', ['file' => $file]);

    $response->assertStatus(200)
        ->assertJsonPath('data.total', 4)
        ->assertJsonPath('data.succeeded', 2)
        ->assertJsonPath('data.failed', 2);

    $results = $response->json('data.results');
    expect($results)->toHaveCount(4);

    $byStatus = array_count_values(array_column($results, 'status'));
    expect($byStatus['success'])->toBe(2);
    expect($byStatus['failed'])->toBe(2);

    // The 'missing MRN' row should have surfaced a field-level error on mrn,
    // and the 'bad gender' row should have surfaced on gender.
    $failed = array_values(array_filter($results, fn ($r) => $r['status'] === 'failed'));
    $errorFields = collect($failed)->flatMap(fn ($r) => array_keys($r['errors']))->all();
    expect($errorFields)->toContain('mrn');
    expect($errorFields)->toContain('gender');
});

it('rejects an upload missing required CSV columns', function () {
    $file = csvFixture([
        ['mrn', 'name'], // missing gender/hospital_id/user_id
        ['M-1', 'No required cols'],
    ]);

    $response = $this->postJson('/api/v1/patients/import', ['file' => $file]);
    $response->assertStatus(422);
});

it('rejects a non-csv upload with 422', function () {
    $bin = UploadedFile::fake()->create('image.png', 10, 'image/png');

    $this->postJson('/api/v1/patients/import', ['file' => $bin])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['file']);
});
