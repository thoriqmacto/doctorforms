<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

it('returns the authenticated user profile', function () {
    $user = User::factory()->create([
        'name'           => 'Authed User',
        'email'          => 'authed@example.com',
        'phone'          => '555-0100',
        'position_title' => 'Doctor',
        'role'           => 'doctor',
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/v1/me/profile')
        ->assertStatus(200)
        ->assertJsonPath('data.id', (string) $user->id)
        ->assertJsonPath('data.attributes.name', 'Authed User')
        ->assertJsonPath('data.attributes.email', 'authed@example.com')
        ->assertJsonPath('data.attributes.phone', '555-0100')
        ->assertJsonPath('data.attributes.positionTitle', 'Doctor')
        ->assertJsonPath('data.attributes.role', 'doctor');
});

it('rejects an unauthenticated profile request', function () {
    $this->getJson('/api/v1/me/profile')->assertStatus(401);
});

it('updates profile fields for the authenticated user', function () {
    $user = User::factory()->create([
        'name'  => 'Old Name',
        'email' => 'old@example.com',
    ]);

    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/me/profile', [
        'name'           => 'New Name',
        'email'          => 'new@example.com',
        'phone'          => '555-7777',
        'position_title' => 'Senior Doctor',
    ])
        ->assertStatus(200)
        ->assertJsonPath('data.attributes.name', 'New Name')
        ->assertJsonPath('data.attributes.email', 'new@example.com');

    $this->assertDatabaseHas('users', [
        'id'    => $user->id,
        'email' => 'new@example.com',
        'phone' => '555-7777',
    ]);
});

it('rejects role mutation via /me/profile', function () {
    $user = User::factory()->create(['role' => 'doctor']);

    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/me/profile', [
        'name' => 'Anything',
        'role' => 'admin',
    ])
        ->assertStatus(422)
        ->assertJsonPath('errors.role.0', 'Role can only be changed by an administrator.');

    $this->assertDatabaseHas('users', [
        'id'   => $user->id,
        'role' => 'doctor',
    ]);
});

it('validates email uniqueness with self-exclude', function () {
    $other = User::factory()->create(['email' => 'taken@example.com']);
    $user  = User::factory()->create(['email' => 'mine@example.com']);

    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/me/profile', ['email' => $other->email])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['email']);

    // Same email as own → allowed.
    $this->patchJson('/api/v1/me/profile', ['email' => 'mine@example.com'])
        ->assertStatus(200);
});

it('rejects password change with wrong current password', function () {
    $user = User::factory()->create([
        'password' => Hash::make('correct-password'),
    ]);

    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/me/password', [
        'current_password'      => 'wrong-password',
        'password'              => 'new-password-123',
        'password_confirmation' => 'new-password-123',
    ])
        ->assertStatus(422)
        ->assertJsonPath('errors.current_password.0', 'Current password is incorrect.');
});

it('updates password when current password matches and new password is confirmed', function () {
    $user = User::factory()->create([
        'password' => Hash::make('correct-password'),
    ]);

    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/me/password', [
        'current_password'      => 'correct-password',
        'password'              => 'new-password-123',
        'password_confirmation' => 'new-password-123',
    ])->assertStatus(200);

    expect(Hash::check('new-password-123', $user->fresh()->password))->toBeTrue();
});

it('rejects password change without confirmation match', function () {
    $user = User::factory()->create([
        'password' => Hash::make('correct-password'),
    ]);

    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/me/password', [
        'current_password'      => 'correct-password',
        'password'              => 'new-password-123',
        'password_confirmation' => 'mismatched',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['password']);
});

it('rejects unauthenticated password change', function () {
    $this->patchJson('/api/v1/me/password', [
        'current_password'      => 'whatever',
        'password'              => 'new-password-123',
        'password_confirmation' => 'new-password-123',
    ])->assertStatus(401);
});
