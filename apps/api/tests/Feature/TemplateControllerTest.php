<?php

use App\Models\{Template, User, Test, Hospital};

it('returns list of templates', function () {
    $user = User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'secret']);
    $test = Test::create(['code' => 'T1', 'name' => 'Test', 'type' => 'blood']);
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);

    Template::create([
        'name' => 'Sample Template',
        'description' => 'Desc',
        'user_id' => $user->id,
        'test_id' => $test->id,
        'hospital_id' => $hospital->id,
    ]);

    $response = $this->getJson('/api/v1/templates');

    $response->assertStatus(200)
        ->assertJsonPath('data.0.attributes.name', 'Sample Template');
});

it('shows a template', function () {
    $user = User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'secret']);
    $test = Test::create(['code' => 'T1', 'name' => 'Test', 'type' => 'blood']);
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);

    $template = Template::create([
        'name' => 'Sample Template',
        'description' => 'Desc',
        'user_id' => $user->id,
        'test_id' => $test->id,
        'hospital_id' => $hospital->id,
    ]);

    $response = $this->getJson('/api/v1/templates/'.$template->id);

    $response->assertStatus(200)
        ->assertJsonPath('data.attributes.name', 'Sample Template');
});

it('creates a template', function () {
    $user = User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'secret']);
    $test = Test::create(['code' => 'T1', 'name' => 'Test', 'type' => 'blood']);
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);

    $response = $this->postJson('/api/v1/templates', [
        'name' => 'New Template',
        'description' => 'Desc',
        'user_id' => $user->id,
        'test_id' => $test->id,
        'hospital_id' => $hospital->id,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.name', 'New Template');

    expect(Template::where('name', 'New Template')->exists())->toBeTrue();
});

it('updates a template', function () {
    $user = User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'secret']);
    $test = Test::create(['code' => 'T1', 'name' => 'Test', 'type' => 'blood']);
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);
    $template = Template::create([
        'name' => 'Sample Template',
        'description' => 'Desc',
        'user_id' => $user->id,
        'test_id' => $test->id,
        'hospital_id' => $hospital->id,
    ]);

    $response = $this->patchJson('/api/v1/templates/'.$template->id, [
        'name' => 'Updated Template',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.attributes.name', 'Updated Template');
});

it('deletes a template', function () {
    $user = User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'secret']);
    $test = Test::create(['code' => 'T1', 'name' => 'Test', 'type' => 'blood']);
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);
    $template = Template::create([
        'name' => 'Sample Template',
        'description' => 'Desc',
        'user_id' => $user->id,
        'test_id' => $test->id,
        'hospital_id' => $hospital->id,
    ]);

    $response = $this->deleteJson('/api/v1/templates/'.$template->id);

    $response->assertStatus(200);
    expect(Template::find($template->id))->toBeNull();
});
