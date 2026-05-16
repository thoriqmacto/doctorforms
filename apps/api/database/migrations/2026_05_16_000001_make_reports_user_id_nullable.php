<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // PR #183 introduced ownership tests that create reports with
        // user_id = null (legacy unassigned reports) and exercise an admin
        // reassignment flow. The original migration declared
        // foreignId('user_id')->constrained() which is NOT NULL by default,
        // so those tests fail on a fresh install. Make the column nullable
        // to match the test/feature intent. Existing rows are unaffected
        // because they all have a user_id today.
        Schema::table('reports', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable(false)->change();
        });
    }
};
