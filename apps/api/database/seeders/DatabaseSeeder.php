<?php

namespace database\seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            UsersTableSeeder::class,
            HospitalsTableSeeder::class,
            HospitalUserTableSeeder::class,
            PatientsTableSeeder::class,
            TestsTableSeeder::class,
            TemplatesTableSeeder::class,
            TemplateFieldsTableSeeder::class,
            ReportsTableSeeder::class,
            ReportFieldsTableSeeder::class,
            MeasurementsTableSeeder::class,
        ]);
    }
}
