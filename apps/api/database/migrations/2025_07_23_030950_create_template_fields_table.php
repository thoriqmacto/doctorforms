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
        Schema::create('template_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained()->onDelete('cascade');
            $table->string('section');
            $table->string('label');
            $table->enum('type',
                ['text', 'number', 'select', 'textarea', 'subtitle', 'title', 'image']
            );
            $table->json('options')->nullable(); // For select fields: [“Normal”, “Abnormal”]
            $table->integer('order')->default(0);
            $table->integer('field_group_order')->default(0);
            $table->timestamps();
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('template_fields');
    }
};
