<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            // Existing templates default to enabled so the publishing gate
            // does not retroactively hide them from doctors/staff.
            $table->boolean('is_enabled')->default(true)->after('layout_config');
        });
    }

    public function down(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $table->dropColumn('is_enabled');
        });
    }
};
