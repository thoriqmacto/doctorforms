<?php

use App\Models\Hospital;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $admin = User::factory()->create(['role' => 'admin']);
    Sanctum::actingAs($admin);
});

it('returns list of hospitals', function () {
    Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);

    $response = $this->getJson('/api/v1/hospitals');

    $response->assertStatus(200)
        ->assertJsonPath('data.0.attributes.name', 'General Hospital');
});

it('shows a hospital', function () {
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);

    $response = $this->getJson('/api/v1/hospitals/'.$hospital->id);

    $response->assertStatus(200)
        ->assertJsonPath('data.attributes.name', 'General Hospital');
});

it('creates a hospital', function () {
    $response = $this->postJson('/api/v1/hospitals', [
        'name' => 'New Hospital',
        'address' => '456 Avenue',
        'phone' => '123',
        'email' => 'test@example.com',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.name', 'New Hospital');

    expect(Hospital::where('name', 'New Hospital')->exists())->toBeTrue();
});

it('updates a hospital', function () {
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);

    $response = $this->putJson('/api/v1/hospitals/'.$hospital->id, [
        'name' => 'Updated Hospital',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.attributes.name', 'Updated Hospital');
});

it('deletes a hospital', function () {
    $hospital = Hospital::create(['name' => 'General Hospital', 'address' => '123 Street']);

    $response = $this->deleteJson('/api/v1/hospitals/'.$hospital->id);

    $response->assertStatus(200);
    expect(Hospital::find($hospital->id))->toBeNull();
});
