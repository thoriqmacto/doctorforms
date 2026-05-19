<?php

use App\Models\Hospital;
use App\Models\Template;
use App\Models\Test as TestModel;
use App\Models\User;
use App\Support\PdfLayoutConfigValidator;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
});

function makeTemplate(): Template
{
    $user = User::factory()->create();
    $test = TestModel::create(['code' => 'TTE', 'name' => 'Echo', 'type' => 'ultrasound']);
    $hospital = Hospital::create(['name' => 'Layout Hospital', 'address' => 'Layout St']);
    return Template::create([
        'name' => 'Layout Template', 'description' => '',
        'user_id' => $user->id, 'test_id' => $test->id, 'hospital_id' => $hospital->id,
    ]);
}

it('persists a valid pdf layout_config on patch', function () {
    $template = makeTemplate();

    $layout = [
        'pdf' => [
            'page' => [
                'size' => 'A4',
                'marginTopMm' => 12, 'marginRightMm' => 12,
                'marginBottomMm' => 12, 'marginLeftMm' => 12,
            ],
            'typography' => [
                'baseFontSizePx' => 12, 'smallFontSizePx' => 10,
                'lineHeight' => 1.4, 'paragraphSpacingPx' => 6,
            ],
            'spacing' => [
                'sectionGapPx' => 10, 'fieldGapPx' => 6,
                'headerGapPx' => 8, 'tableCellPaddingPx' => 5,
            ],
            'density' => 'normal',
        ],
    ];

    $this->patchJson('/api/v1/templates/'.$template->id, [
        'layout_config' => $layout,
    ])->assertStatus(200)
        ->assertJsonPath('data.attributes.layout_config.pdf.typography.baseFontSizePx', 12);

    $template->refresh();
    expect($template->layout_config['pdf']['page']['marginTopMm'])->toBe(12);
});

it('rejects a layout_config with an out-of-range margin', function () {
    $template = makeTemplate();

    $layout = ['pdf' => ['page' => ['marginTopMm' => 9999]]];

    $this->patchJson('/api/v1/templates/'.$template->id, ['layout_config' => $layout])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['layout_config.pdf.page.marginTopMm']);
});

it('rejects a layout_config with a non-numeric font size', function () {
    $template = makeTemplate();

    $layout = ['pdf' => ['typography' => ['baseFontSizePx' => 'huge']]];

    $this->patchJson('/api/v1/templates/'.$template->id, ['layout_config' => $layout])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['layout_config.pdf.typography.baseFontSizePx']);
});

it('rejects a layout_config with an unknown density', function () {
    $template = makeTemplate();

    $layout = ['pdf' => ['density' => 'turbo']];

    $this->patchJson('/api/v1/templates/'.$template->id, ['layout_config' => $layout])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['layout_config.pdf.density']);
});

it('accepts a null layout_config (clears any previous setting)', function () {
    $template = makeTemplate();
    $template->update(['layout_config' => ['pdf' => ['density' => 'spacious']]]);

    $this->patchJson('/api/v1/templates/'.$template->id, ['layout_config' => null])
        ->assertStatus(200);

    $template->refresh();
    expect($template->layout_config)->toBeNull();
});

it('PdfLayoutConfigValidator collects every individual error', function () {
    $errors = [];
    $add = function (string $key, string $msg) use (&$errors) {
        $errors[$key] = $msg;
    };

    PdfLayoutConfigValidator::validate([
        'pdf' => [
            'page' => ['marginTopMm' => -5, 'marginRightMm' => 999, 'size' => 'Letter'],
            'typography' => ['lineHeight' => 0.5, 'baseFontSizePx' => 'big'],
            'spacing' => ['sectionGapPx' => 999],
            'density' => 'turbo',
        ],
    ], $add);

    expect($errors)->toHaveKeys([
        'layout_config.pdf.page.size',
        'layout_config.pdf.page.marginTopMm',
        'layout_config.pdf.page.marginRightMm',
        'layout_config.pdf.typography.baseFontSizePx',
        'layout_config.pdf.typography.lineHeight',
        'layout_config.pdf.spacing.sectionGapPx',
        'layout_config.pdf.density',
    ]);
});
