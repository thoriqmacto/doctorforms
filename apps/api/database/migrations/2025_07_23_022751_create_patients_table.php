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
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('hospital_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->integer('age');
            $table->date('dob')->nullable(); // date-of-birth
            $table->date('dos')->nullable(); // date-of-study
            $table->enum('gender', ['male', 'female'])->nullable();
            $table->string('mrn');
            $table->integer('height_cm');
            $table->integer('weight_kg');
            $table->double('bsa');
            $table->string('blood_pressure');
            $table->string('referring_physician');
            $table->string('diagnosis_brief');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
