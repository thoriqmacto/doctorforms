<?php

namespace Database\Seeders;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Seeder;

class TestsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('tests')->insert([
            'id' => 1,
            'code' => 'TEE',
            'name' => 'Transesophageal Echocardiography',
            'type' => 'semi-invasive',
            'description' => 'High-resolution heart imaging via esophageal ultrasound.',
            'created_at' => Carbon::create(2023, 1, 1, 16, 14, 6),
            'updated_at' => Carbon::create(2023, 1, 1, 16, 14, 6),
        ]);

        DB::table('tests')->insert([
            'id' => 2,
            'code' => 'TTE',
            'name' => 'Transthoracic Echocardiography',
            'type' => 'non-invasive',
            'description' => 'Cardiac imaging using a chest probe.',
            'created_at' => Carbon::create(2023, 1, 2, 16, 14, 6),
            'updated_at' => Carbon::create(2023, 1, 2, 16, 14, 6),
        ]);

    }
}
