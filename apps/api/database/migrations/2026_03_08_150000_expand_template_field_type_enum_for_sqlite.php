<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE template_fields MODIFY type ENUM('text','number','select','textarea','subtitle','title','image','date','checkbox_group','bullseye','patient','user','measurement') NOT NULL");

            return;
        }

        if ($driver !== 'sqlite') {
            return;
        }

        Schema::disableForeignKeyConstraints();

        try {
            if (Schema::hasTable('template_fields_old')) {
                Schema::drop('template_fields_old');
            }

            Schema::rename('template_fields', 'template_fields_old');

            Schema::create('template_fields', function (Blueprint $table) {
                $table->id();
                $table->foreignId('template_id')->constrained()->onDelete('cascade');
                $table->string('section');
                $table->string('label');
                $table->string('unique_name')->nullable();
                $table->enum('type', ['text', 'number', 'select', 'textarea', 'subtitle', 'title', 'image', 'date', 'checkbox_group', 'bullseye', 'patient', 'user', 'measurement']);
                $table->json('options')->nullable();
                $table->integer('order')->default(0);
                $table->integer('field_group_order')->default(0);
                $table->timestamps();
            });

            DB::table('template_fields')->insertUsing(
                ['id', 'template_id', 'section', 'label', 'unique_name', 'type', 'options', 'order', 'field_group_order', 'created_at', 'updated_at'],
                DB::table('template_fields_old')->select(['id', 'template_id', 'section', 'label', 'unique_name', 'type', 'options', 'order', 'field_group_order', 'created_at', 'updated_at'])
            );

            Schema::drop('template_fields_old');

            Schema::table('template_fields', function (Blueprint $table) {
                $table->index(['template_id', 'unique_name']);
            });
        } finally {
            Schema::enableForeignKeyConstraints();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE template_fields MODIFY type ENUM('text','number','select','textarea','subtitle','title','image','date','checkbox_group','bullseye') NOT NULL");
        }
    }
};
