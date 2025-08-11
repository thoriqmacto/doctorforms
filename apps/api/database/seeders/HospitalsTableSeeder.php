<?php

namespace database\seeders;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Seeder;

class HospitalsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {


        DB::table('hospitals')->insert([
            'id' => 1,
            'name' => 'RSUD dr. Soedarso',
            'address' => 'Jl. DR. Soedarso No.1, Bangka Belitung Laut, Kec. Pontianak Tenggara, Kota Pontianak, Kalimantan Barat 78124, Indonesia',
            'phone' => '+62-561-737701',
            'email' => 'tu.rsdrsoedarso@gmail.com',
            'logo_url' => '/storage/logos/hospitals/rsud_soedarso.png',
            'created_at' => Carbon::create(2023, 1, 1, 16, 14, 6),
            'updated_at' => Carbon::create(2023, 1, 1, 16, 14, 6),
        ]);

        DB::table('hospitals')->insert([
            'id' => 2,
            'name' => 'RS Medika Djaya',
            'address' => 'Jl. Parit H. Husin 1 Blok. MD No. 1, Bangka Belitung Laut, Kec. Pontianak Tenggara, Kota Pontianak, Kalimantan Barat 78124, Indonesia',
            'phone' => '+62-561-5688558',
            'email' => 'rsmedikadjaya@gmail.com',
            'logo_url' => '/storage/logos/hospitals/rs_medika_djaya.png',
            'created_at' => Carbon::create(2023, 1, 2, 16, 14, 6),
            'updated_at' => Carbon::create(2023, 1, 2, 16, 14, 6),
        ]);
    }
}
