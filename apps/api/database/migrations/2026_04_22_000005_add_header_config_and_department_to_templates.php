<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            // Structured header block definition. Nullable = legacy templates fall
            // back to the hardcoded buildHospitalHeader path (back-compat).
            $table->json('header_config')->nullable()->after('description');
            // Optional department context so reports can show "Poli Jantung" etc.
            $table->foreignId('department_id')
                ->nullable()
                ->after('hospital_id')
                ->constrained('hospital_departments')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $table->dropConstrainedForeignId('department_id');
            $table->dropColumn('header_config');
        });
    }
};
