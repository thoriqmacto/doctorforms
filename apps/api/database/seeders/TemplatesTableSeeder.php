<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Throwable as ThrowableAlias;

class TemplatesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @throws ThrowableAlias
     */
    public function run(): void
    {
        // pull FK anchors
        $user_id = DB::table('users')->value('id');
        $test_id = DB::table('tests')->value('id');
        $hospital_id = DB::table('hospitals')->value('id');

        if (!$user_id || !$test_id || !$hospital_id) {
            // Avoid analyzer complaining about $this->command?->warn(); just return quietly
            return;
        }

        DB::transaction(function () use ($user_id, $test_id, $hospital_id) {
            // Disable FK checks safely per driver
            $driver = DB::getDriverName();
            if ($driver === 'mysql') {
                DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            } elseif ($driver === 'sqlite') {
                DB::statement('PRAGMA foreign_keys = OFF;');
            }

            DB::table('template_fields')->truncate();
            DB::table('templates')->truncate();

            if ($driver === 'mysql') {
                DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            } elseif ($driver === 'sqlite') {
                DB::statement('PRAGMA foreign_keys = ON;');
            }

            $now = Carbon::now();

            // Insert Template (fixed ID = 1)
            DB::table('templates')->insert([
                'id'          => 1,
                'user_id'     => $user_id,
                'test_id'     => $test_id,
                'hospital_id' => $hospital_id,
                'name'        => 'TEE Default v1',
                'description' => 'TEE structured report (UPF Harapan Kita format)',
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);
        });
    }
}
