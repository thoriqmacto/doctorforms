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
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // owner doctor
            $table->foreignId('hospital_id');
            $table->foreignId('patient_id')->constrained()->onDelete('cascade');
            $table->foreignId('template_id')->constrained();
            $table->string('title');
            $table->string('findings')->nullable();
            $table->string('conclusion')->nullable();
            $table->string('operator')->nullable();
            $table->string('supervisor')->nullable();
            $table->string('device')->nullable();
            $table->string('pdf_url')->nullable(); // store generated PDF path
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
