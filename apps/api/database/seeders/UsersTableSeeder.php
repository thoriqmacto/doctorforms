<?php

namespace Database\Seeders;

class UsersTableSeeder extends CsvSnapshotSeeder
{
    protected function tableName(): string
    {
        return 'users';
    }

    protected function csvTableColumns(): array
    {
        return [
            'id',
            'name',
            'email',
            'email_verified_at',
            'phone',
            'password',
            'remember_token',
            'created_at',
            'updated_at',
            'position_title',
        ];
    }

    protected function nullableColumns(): array
    {
        return ['email_verified_at', 'remember_token'];
    }
}
