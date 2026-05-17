<?php

namespace App\Services\Ocr;

interface OcrEngine
{
    /**
     * Extract text from an image at an absolute filesystem path.
     *
     * Implementations return a metadata-rich array:
     *   [
     *     'raw_text' => string,      // plain text dump (may be empty)
     *     'engine'   => string,      // e.g. 'tesseract'
     *     'ran_at'   => string,      // ISO-8601 timestamp
     *     'meta'     => array,       // engine-specific metadata
     *   ]
     *
     * On failure they throw an OcrException. Callers persist the
     * exception's message into report_images.extraction_error.
     */
    public function extract(string $absolutePath): array;
}
