<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hospitals', function (Blueprint $table) {
            $table->string('short_name')->nullable()->after('name');
            $table->string('parent_org_line')->nullable()->after('short_name');
            $table->string('address_line_1')->nullable()->after('address');
            $table->string('address_line_2')->nullable()->after('address_line_1');
            $table->string('postal_code', 20)->nullable()->after('city');
            $table->string('country')->nullable()->default('Indonesia')->after('postal_code');
            $table->string('fax', 50)->nullable()->after('phone');
            $table->string('whatsapp_phone', 50)->nullable()->after('fax');
            $table->string('secondary_logo_url')->nullable()->after('logo_url');
            $table->string('secondary_logo_path')->nullable()->after('logo_path');
            $table->text('accreditation_text')->nullable()->after('website');
            $table->text('report_footer_line')->nullable()->after('accreditation_text');
        });
    }

    public function down(): void
    {
        Schema::table('hospitals', function (Blueprint $table) {
            $table->dropColumn([
                'short_name',
                'parent_org_line',
                'address_line_1',
                'address_line_2',
                'postal_code',
                'country',
                'fax',
                'whatsapp_phone',
                'secondary_logo_url',
                'secondary_logo_path',
                'accreditation_text',
                'report_footer_line',
            ]);
        });
    }
};
