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
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('templates', function (Blueprint $table) {
            if (! $this->constraintExists('templates', 'templates_test_id_foreign')) {
                $table->foreign('test_id')->references('id')->on('tests')->onDelete('cascade');
            }

            if (! $this->constraintExists('templates', 'templates_hospital_id_foreign')) {
                $table->foreign('hospital_id')->references('id')->on('hospitals')->onDelete('cascade');
            }
        });

        Schema::table('reports', function (Blueprint $table) {
            if (! $this->constraintExists('reports', 'reports_hospital_id_foreign')) {
                $table->foreign('hospital_id')->references('id')->on('hospitals')->onDelete('cascade');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('templates', function (Blueprint $table) {
            if ($this->constraintExists('templates', 'templates_test_id_foreign')) {
                $table->dropForeign('templates_test_id_foreign');
            }

            if ($this->constraintExists('templates', 'templates_hospital_id_foreign')) {
                $table->dropForeign('templates_hospital_id_foreign');
            }
        });

        Schema::table('reports', function (Blueprint $table) {
            if ($this->constraintExists('reports', 'reports_hospital_id_foreign')) {
                $table->dropForeign('reports_hospital_id_foreign');
            }
        });
    }

    private function constraintExists(string $table, string $constraintName): bool
    {
        return DB::table('information_schema.table_constraints')
            ->where('table_schema', DB::getDatabaseName())
            ->where('table_name', $table)
            ->where('constraint_name', $constraintName)
            ->exists();
    }
};
