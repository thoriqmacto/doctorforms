<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $driver = Schema::getConnection()->getDriverName();

            if ($driver === 'mysql') {
                $table->json('layout_config')->nullable()->after('header_config');

                return;
            }

            $table->json('layout_config')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $table->dropColumn('layout_config');
        });
    }
};
