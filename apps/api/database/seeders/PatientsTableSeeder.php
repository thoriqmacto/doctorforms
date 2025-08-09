<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PatientsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('patients')->insert([
            [
                'id' => 1,
                'user_id' => 1,
                'hospital_id' => 1,
                'name' => 'Suhaicih Orin',
                'age' => 59,
                'dob' => date('Y/m/d',strtotime('1964/07/17')),
                'dos' => date('Y/m/d',strtotime('2024/01/03')),
                'gender' => 'female',
                'mrn' => '2023540463',
                'height_cm' => 155,
                'weight_kg' => 89,
                'bsa' => 1.87,
                'blood_pressure' => '163/88',
                'referring_physician' => 'dr. Dwita Ryan, SpJP',
                'diagnosis_brief' => 'HOCM, MR moderate',
                'created_at' => Carbon::create(2024, 1, 3,16,14,6),
                'updated_at' => Carbon::create(2024,1,5,15,18,4),
            ],
        ]);
    }
}
