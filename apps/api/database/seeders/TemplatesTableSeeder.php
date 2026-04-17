<?php

namespace Database\Seeders;

class TemplatesTableSeeder extends CsvSnapshotSeeder
{
    protected function tableName(): string
    {
        return 'templates';
    }

    protected function csvTableColumns(): array
    {
        return ['id', 'user_id', 'test_id', 'hospital_id', 'name', 'description', 'created_at', 'updated_at'];
    }
}
