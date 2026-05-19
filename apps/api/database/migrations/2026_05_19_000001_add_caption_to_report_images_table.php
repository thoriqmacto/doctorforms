<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('report_images', function (Blueprint $table) {
            // Editable display caption rendered under each measurement
            // image in HTML/PDF output. Null = the renderer falls back
            // to original_filename for backward compatibility with
            // images uploaded before this column existed.
            $table->string('caption', 255)->nullable()->after('original_filename');
        });
    }

    public function down(): void
    {
        Schema::table('report_images', function (Blueprint $table) {
            $table->dropColumn('caption');
        });
    }
};
