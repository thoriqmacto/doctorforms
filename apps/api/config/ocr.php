<?php

/**
 * Configuration for the OCR pipeline used by report-image uploads.
 *
 * PR D2 ships a Tesseract-backed extractor that runs synchronously inside
 * the upload request. The schema (report_images.extracted_data) is
 * deliberately just a text dump for now — associating extracted text with
 * template form fields is a follow-up.
 */

return [
    /*
    |--------------------------------------------------------------------------
    | Master switch
    |--------------------------------------------------------------------------
    |
    | When `false`, uploads still succeed but extraction_status stays at
    | `none` (no OCR is attempted). Use this on environments where the
    | `tesseract` binary is not installed or where you want to disable the
    | feature without redeploying code.
    */
    'enabled' => env('OCR_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Engine
    |--------------------------------------------------------------------------
    |
    | The only engine in v1 is `tesseract`. Kept here so a future engine
    | (Google Vision, AWS Textract) can be selected without code churn.
    */
    'engine' => env('OCR_ENGINE', 'tesseract'),

    'tesseract' => [
        // Absolute path to the tesseract binary, or just `tesseract` if it
        // is on $PATH. Linux installs typically have it at /usr/bin/tesseract.
        'binary'   => env('OCR_TESSERACT_BIN', 'tesseract'),

        // Language packs to pass via `-l`. Multiple packs are joined with
        // `+`, e.g. `eng+ind` for English + Indonesian.
        'language' => env('OCR_TESSERACT_LANG', 'eng'),

        // Page Segmentation Mode. 6 = "Assume a single uniform block of
        // text" which is a reasonable default for ultrasound screenshots
        // where the panel of measurements occupies most of the frame.
        'psm'      => (int) env('OCR_TESSERACT_PSM', 6),

        // Wall-clock budget for a single image. We run sync inside the
        // upload request so a stuck process must not hang the API.
        'timeout_seconds' => (int) env('OCR_TESSERACT_TIMEOUT', 15),
    ],
];
