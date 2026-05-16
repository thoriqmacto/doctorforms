<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();

            // Which measurement section in the template the image belongs
            // to (e.g. "Measurements_2D"). Free-form string keyed off
            // the template's section name; not a FK so we keep the row
            // valid even if a section is renamed.
            $table->string('template_section_key')->index();

            // Storage-relative path on the default filesystem disk.
            $table->string('path');
            $table->string('original_filename')->nullable();
            $table->string('mime')->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();

            // Per-image render gate. True by default; the doctor can flip
            // it off to keep the file uploaded but hide it from the
            // generated HTML/PDF.
            $table->boolean('include_in_report')->default(true);

            // Display order inside the report (asc).
            $table->integer('sort_order')->default(0);

            // Audit. Nullable so deleting a user does not nuke the image.
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();

            // Extension points for the next sprint's OCR / parameter
            // extraction work. The status enum is a free-form string here
            // to keep migration churn low — values used by the API:
            //   none | pending | processing | ready | failed
            // extracted_data is whatever the extractor returns (typically
            // an array of { key, value, confidence }). extraction_error
            // holds the last failure message for debugging.
            $table->string('extraction_status')->default('none');
            $table->json('extracted_data')->nullable();
            $table->text('extraction_error')->nullable();

            $table->timestamps();

            $table->index(['report_id', 'template_section_key', 'sort_order'], 'report_images_section_order_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_images');
    }
};
