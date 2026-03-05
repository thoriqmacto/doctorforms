<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('template_fields', function (Blueprint $table) {
            $table->string('unique_name')->nullable()->after('label');
        });

        $fields = DB::table('template_fields')
            ->orderBy('template_id')
            ->orderBy('id')
            ->get(['id', 'template_id', 'section', 'label']);

        $seenByTemplate = [];

        foreach ($fields as $field) {
            $section = Str::slug(Str::lower($field->section ?? 'general'), '_');
            $label = Str::slug(Str::lower($field->label ?? 'field'), '_');
            $section = $section !== '' ? $section : 'general';
            $label = $label !== '' ? $label : 'field';
            $base = "{$section}.{$label}";

            if (!isset($seenByTemplate[$field->template_id])) {
                $seenByTemplate[$field->template_id] = [];
            }

            $candidate = $base;
            $suffix = 2;
            while (in_array($candidate, $seenByTemplate[$field->template_id], true)) {
                $candidate = "{$base}_{$suffix}";
                $suffix++;
            }

            $seenByTemplate[$field->template_id][] = $candidate;

            DB::table('template_fields')
                ->where('id', $field->id)
                ->update(['unique_name' => $candidate]);
        }

        Schema::table('template_fields', function (Blueprint $table) {
            $table->index(['template_id', 'unique_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('template_fields', function (Blueprint $table) {
            $table->dropIndex(['template_id', 'unique_name']);
            $table->dropColumn('unique_name');
        });
    }
};
