<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

abstract class CsvSnapshotSeeder extends Seeder
{
    /**
     * @return list<string>
     */
    abstract protected function csvTableColumns(): array;

    abstract protected function tableName(): string;

    /**
     * Override when CSV filename prefix differs from table name.
     */
    protected function csvPrefix(): string
    {
        return $this->tableName();
    }

    /**
     * @return list<string>
     */
    protected function nullableColumns(): array
    {
        return [];
    }

    public function run(): void
    {
        $rows = $this->readLatestSnapshotRows();

        if ($rows === []) {
            return;
        }

        DB::table($this->tableName())->upsert(
            $rows,
            $this->upsertKeys(),
            array_values(array_diff($this->csvTableColumns(), $this->upsertKeys()))
        );
    }

    /**
     * @return list<string>
     */
    protected function upsertKeys(): array
    {
        return in_array('id', $this->csvTableColumns(), true) ? ['id'] : $this->csvTableColumns();
    }

    /**
     * @return list<array<string, int|float|string|null>>
     */
    protected function readLatestSnapshotRows(): array
    {
        $path = $this->latestSnapshotPath();

        if ($path === null) {
            return [];
        }

        $handle = fopen($path, 'rb');

        if ($handle === false) {
            throw new RuntimeException("Unable to open CSV snapshot: {$path}");
        }

        $header = fgetcsv($handle);

        if ($header === false) {
            fclose($handle);

            return [];
        }

        $rows = [];
        $nullableColumns = $this->nullableColumns();

        while (($values = fgetcsv($handle)) !== false) {
            $row = [];
            foreach ($header as $index => $column) {
                if (!in_array($column, $this->csvTableColumns(), true)) {
                    continue;
                }

                $value = $values[$index] ?? null;

                if ($value === '' && in_array($column, $nullableColumns, true)) {
                    $value = null;
                }

                $row[$column] = $value;
            }

            if ($row !== []) {
                $rows[] = $row;
            }
        }

        fclose($handle);

        return $rows;
    }

    protected function latestSnapshotPath(): ?string
    {
        $pattern = database_path('seeders/ForDeployment/'.$this->csvPrefix().'_*.csv');
        $files = glob($pattern);

        if ($files === false || $files === []) {
            return null;
        }

        usort($files, static fn (string $a, string $b): int => strcmp($a, $b));

        return end($files) ?: null;
    }
}
