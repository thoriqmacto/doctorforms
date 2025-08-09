<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('reports')->insert([
            'id' => 1,
            'user_id' => 1,
            'hospital_id' => 1,
            'patient_id' => 1,
            'template_id' => 1,
            'test_id' => 1,
            'title' => 'TEE Report - Suhaicih Orin',
            'findings' => 'Normal LV function.',
            'conclusion' => 'No significant abnormalities detected.',
            'operator' => 'dr. Gusti Ayu Temi Vidianti SpJP',
            'supervisor' => 'Dr. Dwita Ryan, SpJP',
            'device' => 'GE Vivid i',
            'pdf_url' => null,
            'created_at' => Carbon::create(2024, 1, 5, 10, 0, 0),
            'updated_at' => Carbon::create(2024, 1, 5, 10, 0, 0),
        ]);
    }
}
