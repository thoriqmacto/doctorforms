<?php

use App\Models\User;

it('creates a user', function () {
    $payload = [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'phone' => '555-1234',
        'password' => 'secret123',
    ];

    $response = $this->postJson('/api/v1/users', $payload);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.name', 'Jane Doe')
        ->assertJsonPath('data.attributes.email', 'jane@example.com');

    $this->assertDatabaseHas('users', [
        'email' => 'jane@example.com',
    ]);
});

it('updates a user', function () {
    $user = User::factory()->create([
        'phone' => '555-0000',
    ]);

    $payload = [
        'name' => 'John Smith',
        'email' => 'johnsmith@example.com',
        'phone' => '555-9999',
    ];

    $response = $this->patchJson('/api/v1/users/' . $user->id, $payload);

    $response->assertStatus(200)
        ->assertJsonPath('data.attributes.name', 'John Smith')
        ->assertJsonPath('data.attributes.email', 'johnsmith@example.com');

    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'phone' => '555-9999',
    ]);
});

it('deletes a user', function () {
    $user = User::factory()->create();

    $response = $this->deleteJson('/api/v1/users/' . $user->id);

    $response->assertStatus(200)
        ->assertJsonPath('meta.status', 'deleted');

    $this->assertDatabaseMissing('users', [
        'id' => $user->id,
    ]);
});

