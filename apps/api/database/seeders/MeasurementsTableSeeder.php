<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class MeasurementsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('measurements')->insert([
            'id' => 1,
            'report_id' => 1,
            'name' => 'LVIDd',
            'value' => '5.2',
            'unit' => 'cm',
            'category' => 'LV',
            'created_at' => Carbon::create(2024, 1, 5, 10, 0, 0),
            'updated_at' => Carbon::create(2024, 1, 5, 10, 0, 0),
        ]);
    }
}
