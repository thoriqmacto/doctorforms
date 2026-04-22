<?php

namespace Database\Seeders;

use App\Models\Hospital;
use App\Models\HospitalDepartment;
use App\Models\HospitalSignatory;
use Illuminate\Database\Seeder;

/**
 * Seeds a minimal structure (departments + signatories) for the two demo
 * hospitals so the template builder can bind against real rows. Idempotent.
 */
class HospitalStructureSeeder extends Seeder
{
    public function run(): void
    {
        $soedarso = Hospital::find(1);
        $medika   = Hospital::find(2);

        if ($soedarso) {
            // Backfill the richer identity fields if they are still null.
            $soedarso->forceFill(array_filter([
                'short_name'       => $soedarso->short_name ?? 'RSUD Soedarso',
                'parent_org_line'  => $soedarso->parent_org_line ?? 'PEMERINTAH PROVINSI KALIMANTAN BARAT',
                'province'         => $soedarso->province ?? 'Kalimantan Barat',
                'city'             => $soedarso->city ?? 'Pontianak',
                'postal_code'      => $soedarso->postal_code ?? '78124',
                'country'          => $soedarso->country ?? 'Indonesia',
            ], fn ($v) => $v !== null))->save();

            foreach ([
                ['name' => 'Poliklinik Jantung',    'code' => 'CARDIO'],
                ['name' => 'Instalasi Radiologi',   'code' => 'RAD'],
            ] as $row) {
                HospitalDepartment::firstOrCreate(
                    ['hospital_id' => $soedarso->id, 'name' => $row['name']],
                    ['code' => $row['code'], 'active' => true]
                );
            }

            HospitalSignatory::firstOrCreate(
                ['hospital_id' => $soedarso->id, 'name' => 'dr. Andi Cardio, Sp.JP'],
                [
                    'position_title' => 'Spesialis Jantung & Pembuluh Darah',
                    'sip_number'     => 'SIP.123/2024',
                    'active'         => true,
                ]
            );
        }

        if ($medika) {
            $medika->forceFill(array_filter([
                'short_name'       => $medika->short_name ?? 'RS Medika Djaya',
                'province'         => $medika->province ?? 'Kalimantan Barat',
                'city'             => $medika->city ?? 'Pontianak',
                'country'          => $medika->country ?? 'Indonesia',
            ], fn ($v) => $v !== null))->save();

            HospitalDepartment::firstOrCreate(
                ['hospital_id' => $medika->id, 'name' => 'Poliklinik Jantung'],
                ['code' => 'CARDIO', 'active' => true]
            );

            HospitalSignatory::firstOrCreate(
                ['hospital_id' => $medika->id, 'name' => 'dr. Budi Medika, Sp.JP'],
                ['position_title' => 'Spesialis Jantung & Pembuluh Darah', 'active' => true]
            );
        }
    }
}
