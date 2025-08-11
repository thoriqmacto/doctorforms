<?php

namespace database\seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class HospitalUserTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = Carbon::now();

        DB::table('hospital_user')->insert([
            'hospital_id' => 1,
            'user_id' => 1,
            'role' => 'doctor',
            'department' => 'Cardiology',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('hospital_user')->insert([
            'hospital_id' => 1,
            'user_id' => 2,
            'role' => 'fellow',
            'department' => 'Cardiology',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
}
