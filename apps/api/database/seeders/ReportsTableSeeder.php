<?php

namespace Database\Seeders;

class ReportsTableSeeder extends CsvSnapshotSeeder
{
    protected function tableName(): string
    {
        return 'reports';
    }

    protected function csvTableColumns(): array
    {
        return [
            'id',
            'user_id',
            'hospital_id',
            'patient_id',
            'template_id',
            'title',
            'findings',
            'conclusion',
            'operator',
            'supervisor',
            'device',
            'pdf_url',
            'created_at',
            'updated_at',
            'test_id',
        ];
    }

    protected function nullableColumns(): array
    {
        return ['pdf_url'];
    }
}
