<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE template_fields MODIFY type ENUM('text','number','select','textarea','subtitle','title','image','date','checkbox_group','bullseye','patient','user','measurement') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE template_fields MODIFY type ENUM('text','number','select','textarea','subtitle','title','image','date','checkbox_group','bullseye') NOT NULL");
    }
};
