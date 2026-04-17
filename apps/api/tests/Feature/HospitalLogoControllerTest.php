<?php

use App\Models\Hospital;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('uploads hospital logo', function () {
    Storage::fake('public');
    config(['filesystems.default' => 'public']);

    $hospital = Hospital::create(['name' => 'General', 'address' => '123 Street']);
    $user = User::create([
        'name' => 'User',
        'email' => 'user@example.com',
        'password' => 'secret',
        'role' => 'admin',
    ]);
    $hospital->users()->attach($user->id);
    $this->actingAs($user);

    $response = $this->postJson("/api/v1/hospitals/{$hospital->id}/logo", [
        'logo' => UploadedFile::fake()->image('logo.png'),
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('meta.status', 'logo_uploaded');

    $hospital->refresh();
    expect($hospital->logo_path)->toBe("hospitals/{$hospital->id}/logo.png");
    Storage::disk('public')->assertExists($hospital->logo_path);
});

it('deletes hospital logo', function () {
    Storage::fake('public');
    config(['filesystems.default' => 'public']);

    $hospital = Hospital::create(['name' => 'General', 'address' => '123 Street', 'logo_path' => "hospitals/1/logo.png"]);
    Storage::disk('public')->put("hospitals/{$hospital->id}/logo.png", 'contents');

    $user = User::create([
        'name' => 'User2',
        'email' => 'user2@example.com',
        'password' => 'secret',
        'role' => 'admin',
    ]);
    $hospital->users()->attach($user->id);
    $this->actingAs($user);

    $response = $this->deleteJson("/api/v1/hospitals/{$hospital->id}/logo");

    $response->assertStatus(200)
        ->assertJsonPath('meta.status', 'logo_deleted');

    Storage::disk('public')->assertMissing("hospitals/{$hospital->id}/logo.png");
    $hospital->refresh();
    expect($hospital->logo_path)->toBeNull();
});
