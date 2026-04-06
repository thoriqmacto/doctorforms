<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('patients') || ! Schema::hasTable('hospitals')) {
            return;
        }

        if (! Schema::hasColumn('patients', 'hospital_id')) {
            return;
        }

        if ($this->hospitalForeignKeyExists()) {
            return;
        }

        Schema::table('patients', function (Blueprint $table) {
            $table->foreign('hospital_id')->references('id')->on('hospitals')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('patients')) {
            return;
        }

        if (! $this->hospitalForeignKeyExists()) {
            return;
        }

        Schema::table('patients', function (Blueprint $table) {
            $table->dropForeign(['hospital_id']);
        });
    }

    private function hospitalForeignKeyExists(): bool
    {
        $connection = DB::connection();
        $driver = $connection->getDriverName();

        if ($driver !== 'mysql') {
            return false;
        }

        $database = $connection->getDatabaseName();

        $count = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', $database)
            ->where('TABLE_NAME', 'patients')
            ->where('COLUMN_NAME', 'hospital_id')
            ->where('REFERENCED_TABLE_NAME', 'hospitals')
            ->count();

        return $count > 0;
    }
};
