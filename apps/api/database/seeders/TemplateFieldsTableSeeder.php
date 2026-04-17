<?php

namespace Database\Seeders;

class TemplateFieldsTableSeeder extends CsvSnapshotSeeder
{
    protected function tableName(): string
    {
        return 'template_fields';
    }

    protected function csvTableColumns(): array
    {
        return [
            'id',
            'template_id',
            'section',
            'label',
            'unique_name',
            'type',
            'options',
            'order',
            'field_group_order',
            'created_at',
            'updated_at',
        ];
    }
}
