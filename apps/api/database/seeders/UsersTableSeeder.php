<?php

namespace Database\Seeders;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Database\Seeder;

class UsersTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('users')->upsert([
            [
                'id' => 1,
                'name' => 'dr. Gusti Ayu Temi Vidianti SpJP',
                'email' => 'gustiayutemi@gmail.com',
                'phone' => '081386677544',
                'position_title' => 'Cardiologist',
                'password' => Hash::make('password'),
                'created_at' => Carbon::create(2024, 1, 3, 16, 14, 6),
                'updated_at' => Carbon::create(2024, 1, 5, 15, 18, 4),
            ],
            [
                'id' => 2,
                'name' => 'Thariq',
                'email' => 'thoriqmacto@gmail.com',
                'phone' => '081291232924',
                'position_title' => 'Cardiology Fellow',
                'password' => Hash::make('password'),
                'created_at' => Carbon::create(2024, 1, 3, 16, 14, 6),
                'updated_at' => Carbon::create(2024, 1, 5, 15, 18, 4),
            ],
        ], ['id']);
    }
}
