<?php

namespace Database\Seeders;

class TestsTableSeeder extends CsvSnapshotSeeder
{
    protected function tableName(): string
    {
        return 'tests';
    }

    protected function csvTableColumns(): array
    {
        return ['id', 'code', 'name', 'type', 'description', 'created_at', 'updated_at'];
    }
}
