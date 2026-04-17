<?php

namespace Database\Seeders;

class HospitalUserTableSeeder extends CsvSnapshotSeeder
{
    protected function tableName(): string
    {
        return 'hospital_user';
    }

    protected function csvTableColumns(): array
    {
        return ['hospital_id', 'user_id', 'role', 'department', 'created_at', 'updated_at'];
    }

    protected function upsertKeys(): array
    {
        return ['hospital_id', 'user_id'];
    }
}
