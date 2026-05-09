<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->integer('age')->nullable()->change();
            $table->integer('height_cm')->nullable()->change();
            $table->integer('weight_kg')->nullable()->change();
            $table->double('bsa')->nullable()->change();
            $table->string('blood_pressure')->nullable()->change();
            $table->string('referring_physician')->nullable()->change();
            $table->string('diagnosis_brief')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->integer('age')->nullable(false)->change();
            $table->integer('height_cm')->nullable(false)->change();
            $table->integer('weight_kg')->nullable(false)->change();
            $table->double('bsa')->nullable(false)->change();
            $table->string('blood_pressure')->nullable(false)->change();
            $table->string('referring_physician')->nullable(false)->change();
            $table->string('diagnosis_brief')->nullable(false)->change();
        });
    }
};
