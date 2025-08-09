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
                'name'        => 'Echocardiography Report Template',
                'description' => 'Standard echo report template.',
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);

            // Related fields
            $fields = [
                // Header
                [
                    'template_id'       => 1,
                    'section'           => 'Header',
                    'label'             => 'Logo',
                    'type'              => 'image',
                    'options'           => null,
                    'order'             => 0,
                    'field_group_order' => 0,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ],
                [
                    'template_id'       => 1,
                    'section'           => 'Header',
                    'label'             => 'Transesophageal Echocardiography Report',
                    'type'              => 'title',
                    'options'           => null,
                    'order'             => 1,
                    'field_group_order' => 0,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ],

                // LV
                [
                    'template_id'       => 1,
                    'section'           => 'LV',
                    'label'             => 'LV Size',
                    'type'              => 'select',
                    'options'           => json_encode(['Normal','Dilated','Small']),
                    'order'             => 1,
                    'field_group_order' => 1,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ],
                [
                    'template_id'       => 1,
                    'section'           => 'LV',
                    'label'             => 'LVEF (%)',
                    'type'              => 'number',
                    'options'           => null,
                    'order'             => 2,
                    'field_group_order' => 1,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ],
                [
                    'template_id'       => 1,
                    'section'           => 'LV',
                    'label'             => 'Wall Motion',
                    'type'              => 'select',
                    'options'           => json_encode(['Normal','Hypokinetic','Akinetic','Dyskinetic']),
                    'order'             => 3,
                    'field_group_order' => 1,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ],

                // RV
                [
                    'template_id'       => 1,
                    'section'           => 'RV',
                    'label'             => 'RV Size',
                    'type'              => 'select',
                    'options'           => json_encode(['Normal','Dilated']),
                    'order'             => 1,
                    'field_group_order' => 2,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ],
                [
                    'template_id'       => 1,
                    'section'           => 'RV',
                    'label'             => 'RV Function',
                    'type'              => 'select',
                    'options'           => json_encode(['Normal','Mildly reduced','Moderately reduced','Severely reduced']),
                    'order'             => 2,
                    'field_group_order' => 2,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ],

                // Valves
                [
                    'template_id'       => 1,
                    'section'           => 'Valves',
                    'label'             => 'Mitral Valve Function',
                    'type'              => 'select',
                    'options'           => json_encode(['Normal','Stenosis','Regurgitation']),
                    'order'             => 1,
                    'field_group_order' => 3,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ],
                [
                    'template_id'       => 1,
                    'section'           => 'Valves',
                    'label'             => 'Aortic Valve',
                    'type'              => 'select',
                    'options'           => json_encode(['Normal','Mild AR','Moderate AR','Severe AR','Mild AS','Moderate AS','Severe AS']),
                    'order'             => 2,
                    'field_group_order' => 3,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ],
                [
                    'template_id'       => 1,
                    'section'           => 'Valves',
                    'label'             => 'Tricuspid Valve',
                    'type'              => 'select',
                    'options'           => json_encode(['Normal','Mild TR','Moderate TR','Severe TR']),
                    'order'             => 3,
                    'field_group_order' => 3,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ],

                // Pericardium
                [
                    'template_id'       => 1,
                    'section'           => 'Pericardium',
                    'label'             => 'Pericardial Effusion',
                    'type'              => 'select',
                    'options'           => json_encode(['Absent','Mild','Moderate','Severe']),
                    'order'             => 1,
                    'field_group_order' => 4,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ],

                // Aorta (optional — add if you need)
                [
                    'template_id'       => 1,
                    'section'           => 'Aorta',
                    'label'             => 'Aortic Root Diameter (mm)',
                    'type'              => 'number',
                    'options'           => null,
                    'order'             => 1,
                    'field_group_order' => 5,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ],
            ];

            DB::table('template_fields')->insert($fields);
        });
    }
}
