<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'position_title')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('position_title')->nullable()->after('phone');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('users', 'position_title')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('position_title');
            });
        }
    }
};

