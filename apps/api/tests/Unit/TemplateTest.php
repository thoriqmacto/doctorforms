<?php

use App\Models\Template;
use App\Models\Test as TestModel;
use App\Models\User;
use App\Models\Hospital;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

test('template fillable includes user, test and hospital ids', function () {
    $template = new Template();
    expect($template->getFillable())->toContain('user_id')
        ->toContain('test_id')
        ->toContain('hospital_id');
});

test('template belongs to a user', function () {
    $template = new Template();
    expect($template->user())->toBeInstanceOf(BelongsTo::class)
        ->and($template->user()->getRelated())->toBeInstanceOf(User::class);
});

test('template belongs to a test', function () {
    $template = new Template();
    expect($template->test())->toBeInstanceOf(BelongsTo::class)
        ->and($template->test()->getRelated())->toBeInstanceOf(TestModel::class);
});

test('template belongs to a hospital', function () {
    $template = new Template();
    expect($template->hospital())->toBeInstanceOf(BelongsTo::class)
        ->and($template->hospital()->getRelated())->toBeInstanceOf(Hospital::class);
});
