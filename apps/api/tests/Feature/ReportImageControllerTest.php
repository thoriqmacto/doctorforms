<?php

use App\Models\{Hospital, Patient, Report, ReportImage, Template, Test as TestModel, User};
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

function makeImageReportContext(?User $owner = null): array
{
    $owner ??= User::factory()->create(['role' => 'doctor']);
    $hospital = Hospital::create(['name' => 'Hospital '.uniqid(), 'address' => '1']);
    $test = TestModel::create(['code' => 'T'.uniqid(), 'name' => 'Test '.uniqid(), 'type' => 'blood']);
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
        'name' => 'Img Patient',
        'age' => 50,
        'gender' => 'male',
        'mrn' => 'MRN'.uniqid(),
        'height_cm' => 170,
        'weight_kg' => 70,
    ]);
    $report = Report::create([
        'user_id'     => $owner->id,
        'hospital_id' => $hospital->id,
        'patient_id'  => $patient->id,
        'template_id' => $template->id,
        'test_id'     => $test->id,
        'title'       => 'Image report',
    ]);

    return compact('owner', 'report');
}

beforeEach(function () {
    Storage::fake(config('filesystems.default'));
});

it('lets the report owner upload an image', function () {
    $ctx = makeImageReportContext();
    Sanctum::actingAs($ctx['owner']);

    $file = UploadedFile::fake()->image('m2d.png', 800, 600);

    $response = $this->postJson(
        '/api/v1/reports/'.$ctx['report']->id.'/images',
        [
            'image'                => $file,
            'template_section_key' => 'Measurements_2D',
        ]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.template_section_key', 'Measurements_2D')
        ->assertJsonPath('data.include_in_report', true)
        ->assertJsonPath('data.extraction_status', 'none');

    $disk = Storage::disk(config('filesystems.default'));
    $path = $response->json('data.path');
    expect($disk->exists($path))->toBeTrue();
});

it('rejects an upload from a non-owner non-admin user', function () {
    $ctx = makeImageReportContext();
    $intruder = User::factory()->create(['role' => 'doctor']);
    Sanctum::actingAs($intruder);

    $this->postJson(
        '/api/v1/reports/'.$ctx['report']->id.'/images',
        [
            'image'                => UploadedFile::fake()->image('x.png'),
            'template_section_key' => 'Measurements_2D',
        ]
    )->assertStatus(403);
});

it('lets an admin upload to any report', function () {
    $ctx = makeImageReportContext();
    $admin = User::factory()->create(['role' => 'admin']);
    Sanctum::actingAs($admin);

    $this->postJson(
        '/api/v1/reports/'.$ctx['report']->id.'/images',
        [
            'image'                => UploadedFile::fake()->image('x.png'),
            'template_section_key' => 'Measurements_2D',
        ]
    )->assertStatus(201);
});

it('rejects non-image and oversized uploads', function () {
    $ctx = makeImageReportContext();
    Sanctum::actingAs($ctx['owner']);

    // Non-image MIME → 422.
    $this->postJson(
        '/api/v1/reports/'.$ctx['report']->id.'/images',
        [
            'image'                => UploadedFile::fake()->create('notes.txt', 50, 'text/plain'),
            'template_section_key' => 'Measurements_2D',
        ]
    )
        ->assertStatus(422)
        ->assertJsonValidationErrors(['image']);

    // Over 5MB → 422.
    $big = UploadedFile::fake()->image('huge.png')->size(6 * 1024);
    $this->postJson(
        '/api/v1/reports/'.$ctx['report']->id.'/images',
        [
            'image'                => $big,
            'template_section_key' => 'Measurements_2D',
        ]
    )->assertStatus(422)
        ->assertJsonValidationErrors(['image']);
});

it('toggles include_in_report on an existing image', function () {
    $ctx = makeImageReportContext();
    Sanctum::actingAs($ctx['owner']);

    $img = ReportImage::create([
        'report_id'            => $ctx['report']->id,
        'template_section_key' => 'Measurements_2D',
        'path'                 => 'reports/'.$ctx['report']->id.'/dummy.png',
        'mime'                 => 'image/png',
        'size_bytes'           => 100,
        'include_in_report'    => true,
        'sort_order'           => 0,
    ]);

    $this->patchJson('/api/v1/report-images/'.$img->id, ['include_in_report' => false])
        ->assertStatus(200)
        ->assertJsonPath('data.include_in_report', false);

    expect($img->fresh()->include_in_report)->toBeFalse();
});

it('deletes the image row and the stored file', function () {
    $ctx = makeImageReportContext();
    Sanctum::actingAs($ctx['owner']);

    // Upload a real file so we can verify it's removed.
    $upload = $this->postJson(
        '/api/v1/reports/'.$ctx['report']->id.'/images',
        [
            'image'                => UploadedFile::fake()->image('x.png'),
            'template_section_key' => 'Measurements_2D',
        ]
    )->json('data');

    $disk = Storage::disk(config('filesystems.default'));
    expect($disk->exists($upload['path']))->toBeTrue();

    $this->deleteJson('/api/v1/report-images/'.$upload['id'])
        ->assertStatus(200)
        ->assertJsonPath('meta.status', 'deleted');

    expect(ReportImage::find($upload['id']))->toBeNull();
    expect($disk->exists($upload['path']))->toBeFalse();
});

it('lists images for a report in sort_order, then id', function () {
    $ctx = makeImageReportContext();
    Sanctum::actingAs($ctx['owner']);

    $second = ReportImage::create([
        'report_id'            => $ctx['report']->id,
        'template_section_key' => 'Measurements_2D',
        'path'                 => 'reports/'.$ctx['report']->id.'/b.png',
        'mime'                 => 'image/png',
        'size_bytes'           => 100,
        'include_in_report'    => true,
        'sort_order'           => 2,
    ]);
    $first = ReportImage::create([
        'report_id'            => $ctx['report']->id,
        'template_section_key' => 'Measurements_2D',
        'path'                 => 'reports/'.$ctx['report']->id.'/a.png',
        'mime'                 => 'image/png',
        'size_bytes'           => 100,
        'include_in_report'    => true,
        'sort_order'           => 1,
    ]);

    $ids = collect($this->getJson('/api/v1/reports/'.$ctx['report']->id.'/images')->json('data'))
        ->pluck('id')->map(fn ($id) => (int) $id)->all();

    expect($ids)->toBe([$first->id, $second->id]);
});

it('surfaces images inline on GET /reports/{id}', function () {
    $ctx = makeImageReportContext();
    Sanctum::actingAs($ctx['owner']);

    ReportImage::create([
        'report_id'            => $ctx['report']->id,
        'template_section_key' => 'Measurements_2D',
        'path'                 => 'reports/'.$ctx['report']->id.'/inline.png',
        'mime'                 => 'image/png',
        'size_bytes'           => 100,
        'include_in_report'    => true,
        'sort_order'           => 0,
    ]);

    $images = $this->getJson('/api/v1/reports/'.$ctx['report']->id)
        ->assertStatus(200)
        ->json('data.attributes.images');

    expect($images)->toBeArray()->and(count($images))->toBe(1);
});
