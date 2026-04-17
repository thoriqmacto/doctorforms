<?php

namespace Database\Seeders;

class PatientsTableSeeder extends CsvSnapshotSeeder
{
    protected function tableName(): string
    {
        return 'patients';
    }

    protected function csvTableColumns(): array
    {
        return [
            'id',
            'user_id',
            'hospital_id',
            'name',
            'age',
            'dob',
            'dos',
            'gender',
            'mrn',
            'height_cm',
            'weight_kg',
            'bsa',
            'blood_pressure',
            'referring_physician',
            'diagnosis_brief',
            'created_at',
            'updated_at',
        ];
    }
}
