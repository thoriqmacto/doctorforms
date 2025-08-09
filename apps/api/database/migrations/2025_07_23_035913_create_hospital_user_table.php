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
        Schema::create('hospital_user', function (Blueprint $table) {
            $table->foreignId('hospital_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('role', ['admin', 'doctor', 'fellow', 'supervisor'])->default('doctor');
            $table->string('department')->nullable(); // Optional (e.g. Cardiology)
            $table->timestamps();

            $table->primary(['hospital_id', 'user_id']); // Composite PK
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hospital_user');
    }
};
