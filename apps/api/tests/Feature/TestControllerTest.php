<?php

use App\Models\Test as TestModel;

it('returns list of tests', function () {
    TestModel::create([
        'code' => 'TTE',
        'name' => 'Echo',
        'type' => 'ultrasound',
        'description' => 'desc',
    ]);

    $response = $this->getJson('/api/v1/tests');

    $response->assertStatus(200)
        ->assertJsonPath('data.0.attributes.code', 'TTE')
        ->assertJsonPath('data.0.attributes.name', 'Echo');
});

