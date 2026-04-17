<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Notification;

it('logs in user and returns a bearer token payload', function () {
    $password = 'secret1234';
    $user = User::factory()->create([
        'email' => 'auth@example.com',
        'password' => $password,
        'role' => 'doctor',
    ]);

    $response = $this->postJson('/api/v1/login', [
        'email' => $user->email,
        'password' => $password,
    ]);

    $response->assertOk()
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('message', 'Authenticated')
        ->assertJsonPath('data.user.email', $user->email)
        ->assertJsonPath('data.user.role', 'doctor');

    expect($response->json('data.token'))->not->toBeEmpty();
});

it('logs out the authenticated user', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withToken($token)->postJson('/api/v1/logout');

    $response->assertOk()->assertJsonPath('message', 'Logged out');
});

it('sends forgot password link', function () {
    Notification::fake();
    $user = User::factory()->create(['email' => 'forgot@example.com']);

    $response = $this->postJson('/api/v1/forgot-password', [
        'email' => $user->email,
    ]);

    $response->assertOk()->assertJsonPath('status', 'success');

    Notification::assertSentTo($user, ResetPassword::class);
});

it('forbids non admin user from user management endpoint', function () {
    $doctor = User::factory()->create(['role' => 'doctor']);
    $token = $doctor->createToken('doctor-token')->plainTextToken;

    $response = $this->withToken($token)->getJson('/api/v1/users');

    $response->assertForbidden();
});

it('allows admin user to access user management endpoint', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $token = $admin->createToken('admin-token')->plainTextToken;

    $response = $this->withToken($token)->getJson('/api/v1/users');

    $response->assertOk();
});
