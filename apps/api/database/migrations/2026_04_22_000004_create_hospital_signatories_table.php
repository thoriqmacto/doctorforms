<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hospital_signatories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('position_title')->nullable();
            $table->string('sip_number')->nullable();
            $table->string('signature_image_path')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['hospital_id', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hospital_signatories');
    }
};
