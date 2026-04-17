<?php

namespace Database\Seeders;

class MeasurementsTableSeeder extends CsvSnapshotSeeder
{
    protected function tableName(): string
    {
        return 'measurements';
    }

    protected function csvTableColumns(): array
    {
        return ['id', 'report_id', 'name', 'value', 'unit', 'category', 'created_at', 'updated_at'];
    }
}
