<?php

use App\Models\{Hospital, User};
use Laravel\Sanctum\Sanctum;

it('lets a doctor create a patient end-to-end', function () {
    $doctor = User::factory()->create(['role' => 'doctor', 'name' => 'Dr Test']);
    Sanctum::actingAs($doctor);

    $hospital = Hospital::create(['name' => 'Open Hospital', 'address' => '1']);

    // The doctor sees the hospital list (regression for the Add Patient
    // workflow that was blocked by the previous admin-only gate).
    $hospitals = $this->getJson('/api/v1/hospitals')
        ->assertStatus(200)
        ->json('data');
    expect(collect($hospitals)->pluck('id')->map(fn ($id) => (int) $id)->all())
        ->toContain($hospital->id);

    // The doctor can create a patient against that hospital.
    $payload = [
        'mrn'         => 'DOC'.uniqid(),
        'name'        => 'Created By Doctor',
        'gender'      => 'male',
        'dob'         => '2000-01-01',
        'age'         => 25,
        'height_cm'   => 170,
        'weight_kg'   => 70,
        'bsa'         => 1.81,
        'hospital_id' => $hospital->id,
        'user_id'     => $doctor->id,
    ];

    $this->postJson('/api/v1/patients', $payload)
        ->assertStatus(201)
        ->assertJsonPath('data.attributes.name', 'Created By Doctor')
        ->assertJsonPath('data.attributes.bsa', '1.81');

    $this->assertDatabaseHas('patients', [
        'name'        => 'Created By Doctor',
        'hospital_id' => $hospital->id,
        'user_id'     => $doctor->id,
    ]);
});
