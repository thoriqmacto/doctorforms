<?php

namespace App\Support;

/**
 * Allowlist of {source, path} combinations that a template field binding
 * is allowed to reference. This is the backend half of the contract
 * mirrored in apps/web/lib/template-renderer/schema/bindings.ts.
 *
 * Keep this file in sync with the web-side catalog. Adding a new path
 * here and not on the web (or vice versa) is a bug.
 */
class EntityBindingCatalog
{
    /**
     * @return array<string, string[]> source => list of allowed dotted paths
     */
    public static function map(): array
    {
        return [
            'hospital' => [
                'name',
                'short_name',
                'parent_org_line',
                'address',
                'address_line_1',
                'address_line_2',
                'province',
                'city',
                'postal_code',
                'country',
                'phone',
                'fax',
                'whatsapp_phone',
                'email',
                'website',
                'logo_url',
                'secondary_logo_url',
                'accreditation_text',
                'report_footer_line',
            ],
            'patient' => [
                'name',
                'mrn',
                'gender',
                'dob',
                'dos',
                'age',
                'height_cm',
                'weight_kg',
                'bsa',
                'blood_pressure',
                'diagnosis_brief',
                'referring_physician',
            ],
            'user' => [
                'name',
                'email',
                'phone',
                'position_title',
            ],
            'report' => [
                'title',
                'findings',
                'conclusion',
                'operator',
                'supervisor',
                'device',
            ],
            'signatory' => [
                'name',
                'position_title',
                'sip_number',
                'signature_image_url',
            ],
            'test' => [
                'code',
                'name',
                'type',
                'description',
            ],
            // `measurement` does not use path — it uses options.measurement_name.
            // `literal` means a verbatim string stored in binding.value.
        ];
    }

    public static function sources(): array
    {
        return array_keys(self::map());
    }

    public static function isValid(string $source, string $path): bool
    {
        $map = self::map();
        if (!isset($map[$source])) {
            return false;
        }

        return in_array($path, $map[$source], true);
    }
}
