<?php

namespace database\seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportFieldsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $reportId = DB::table('reports')->value('id');
        $lvSizeId = DB::table('template_fields')->where('label', 'LV Size')->value('id');
        $lvefId = DB::table('template_fields')->where('label', 'LVEF (%)')->value('id');

        if (!$reportId || !$lvSizeId || !$lvefId) {
            return;
        }

        $now = Carbon::now();

        DB::table('report_fields')->insert([
            [
                'report_id' => $reportId,
                'template_field_id' => $lvSizeId,
                'value' => 'Normal',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'report_id' => $reportId,
                'template_field_id' => $lvefId,
                'value' => '60',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }
}
