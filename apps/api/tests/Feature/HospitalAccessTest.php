<?php

use App\Models\{Hospital, User};
use Laravel\Sanctum\Sanctum;

it('lets a doctor list hospitals', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'doctor']));

    Hospital::create(['name' => 'Listable Hospital', 'address' => '1']);

    $this->getJson('/api/v1/hospitals')
        ->assertStatus(200)
        ->assertJsonStructure(['data']);
});

it('lets a doctor show a single hospital', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'doctor']));

    $hospital = Hospital::create(['name' => 'Showable Hospital', 'address' => '1']);

    $this->getJson('/api/v1/hospitals/'.$hospital->id)
        ->assertStatus(200)
        ->assertJsonPath('data.id', (string) $hospital->id)
        ->assertJsonPath('data.attributes.name', 'Showable Hospital');
});

it('forbids a doctor from creating a hospital', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'doctor']));

    $this->postJson('/api/v1/hospitals', [
        'name'    => 'New Hospital',
        'address' => 'X',
    ])->assertStatus(403);
});

it('forbids a doctor from updating a hospital', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'doctor']));
    $hospital = Hospital::create(['name' => 'Existing', 'address' => '1']);

    $this->patchJson('/api/v1/hospitals/'.$hospital->id, ['name' => 'Renamed'])
        ->assertStatus(403);

    expect($hospital->fresh()->name)->toBe('Existing');
});

it('forbids a doctor from deleting a hospital', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'doctor']));
    $hospital = Hospital::create(['name' => 'Keep me', 'address' => '1']);

    $this->deleteJson('/api/v1/hospitals/'.$hospital->id)->assertStatus(403);

    expect(Hospital::find($hospital->id))->not->toBeNull();
});

it('still lets an admin manage hospitals end-to-end', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

    $created = $this->postJson('/api/v1/hospitals', [
        'name'    => 'Admin Hospital',
        'address' => '1',
    ])->assertStatus(201)->json('data.id');

    $this->patchJson('/api/v1/hospitals/'.$created, ['name' => 'Renamed Admin'])
        ->assertStatus(200);

    $this->deleteJson('/api/v1/hospitals/'.$created)->assertStatus(200);
});
