<?php

namespace App\Support;

/**
 * Server-side mirror of apps/web/lib/template-renderer/pdfLayoutConfig.ts.
 *
 * Validates the `pdf` section of a templates.layout_config payload to
 * ensure:
 *  - structure matches the documented schema
 *  - all leaves are numbers or the small set of safe enums (density, size)
 *  - numeric values land within their documented bounds
 *
 * No arbitrary strings are ever stored — the renderer converts these
 * numbers into px/pt itself, so the schema is the only sanitization
 * surface for the PDF layout knobs.
 */
class PdfLayoutConfigValidator
{
    public const ALLOWED_DENSITIES = ['compact', 'normal', 'spacious'];
    public const ALLOWED_PAGE_SIZES = ['A4'];

    /** Keep these in sync with PDF_LAYOUT_BOUNDS in pdfLayoutConfig.ts. */
    public const BOUNDS = [
        'marginMm'           => ['min' => 0, 'max' => 40],
        'baseFontSizePx'     => ['min' => 8, 'max' => 18],
        'smallFontSizePx'    => ['min' => 6, 'max' => 16],
        'lineHeight'         => ['min' => 1, 'max' => 2],
        'paragraphSpacingPx' => ['min' => 0, 'max' => 24],
        'sectionGapPx'       => ['min' => 0, 'max' => 48],
        'fieldGapPx'         => ['min' => 0, 'max' => 24],
        'headerGapPx'        => ['min' => 0, 'max' => 32],
        'tableCellPaddingPx' => ['min' => 0, 'max' => 16],
    ];

    /**
     * Run validation; on failure call the closure with ($key, $message) for each
     * error so the caller can route them through Laravel's Validator.
     *
     * @param  array<string, mixed>|null  $layoutConfig
     * @param  callable(string, string):void  $addError
     */
    public static function validate(?array $layoutConfig, callable $addError): void
    {
        if ($layoutConfig === null) {
            return;
        }
        $pdf = $layoutConfig['pdf'] ?? null;
        if ($pdf === null) {
            return; // pdf section is optional — other layout keys may live alongside it later
        }
        if (!is_array($pdf)) {
            $addError('layout_config.pdf', 'layout_config.pdf must be an object.');
            return;
        }

        self::validatePageSection($pdf['page'] ?? null, $addError);
        self::validateTypographySection($pdf['typography'] ?? null, $addError);
        self::validateSpacingSection($pdf['spacing'] ?? null, $addError);

        if (array_key_exists('density', $pdf)) {
            $density = $pdf['density'];
            if (!is_string($density) || !in_array($density, self::ALLOWED_DENSITIES, true)) {
                $addError('layout_config.pdf.density', 'density must be one of: '.implode(', ', self::ALLOWED_DENSITIES));
            }
        }
    }

    private static function validatePageSection(mixed $page, callable $addError): void
    {
        if ($page === null) {
            return;
        }
        if (!is_array($page)) {
            $addError('layout_config.pdf.page', 'layout_config.pdf.page must be an object.');
            return;
        }
        if (array_key_exists('size', $page)) {
            $size = $page['size'];
            if (!is_string($size) || !in_array($size, self::ALLOWED_PAGE_SIZES, true)) {
                $addError('layout_config.pdf.page.size', 'page.size must be one of: '.implode(', ', self::ALLOWED_PAGE_SIZES));
            }
        }
        $marginKeys = ['marginTopMm', 'marginRightMm', 'marginBottomMm', 'marginLeftMm'];
        foreach ($marginKeys as $k) {
            self::validateBoundedNumber("layout_config.pdf.page.{$k}", $page[$k] ?? null, self::BOUNDS['marginMm'], $addError);
        }
    }

    private static function validateTypographySection(mixed $typography, callable $addError): void
    {
        if ($typography === null) {
            return;
        }
        if (!is_array($typography)) {
            $addError('layout_config.pdf.typography', 'layout_config.pdf.typography must be an object.');
            return;
        }
        $checks = [
            'baseFontSizePx'     => 'baseFontSizePx',
            'smallFontSizePx'    => 'smallFontSizePx',
            'lineHeight'         => 'lineHeight',
            'paragraphSpacingPx' => 'paragraphSpacingPx',
        ];
        foreach ($checks as $field => $boundsKey) {
            self::validateBoundedNumber(
                "layout_config.pdf.typography.{$field}",
                $typography[$field] ?? null,
                self::BOUNDS[$boundsKey],
                $addError,
            );
        }
    }

    private static function validateSpacingSection(mixed $spacing, callable $addError): void
    {
        if ($spacing === null) {
            return;
        }
        if (!is_array($spacing)) {
            $addError('layout_config.pdf.spacing', 'layout_config.pdf.spacing must be an object.');
            return;
        }
        $checks = ['sectionGapPx', 'fieldGapPx', 'headerGapPx', 'tableCellPaddingPx'];
        foreach ($checks as $field) {
            self::validateBoundedNumber(
                "layout_config.pdf.spacing.{$field}",
                $spacing[$field] ?? null,
                self::BOUNDS[$field],
                $addError,
            );
        }
    }

    /**
     * @param  array{min:int|float, max:int|float}  $bounds
     */
    private static function validateBoundedNumber(string $key, mixed $value, array $bounds, callable $addError): void
    {
        if ($value === null) {
            return; // optional within its section
        }
        if (!is_int($value) && !is_float($value)) {
            $addError($key, "{$key} must be a number.");
            return;
        }
        if ($value < $bounds['min'] || $value > $bounds['max']) {
            $addError($key, "{$key} must be between {$bounds['min']} and {$bounds['max']}.");
        }
    }
}
