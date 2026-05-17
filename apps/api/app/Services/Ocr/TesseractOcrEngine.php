<?php

namespace App\Services\Ocr;

use Illuminate\Support\Carbon;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\Process;

/**
 * Shells out to the `tesseract` CLI. Writes nothing to disk: we read the
 * recognised text from the binary's stdout by passing `-` as the output
 * stem, which keeps cleanup trivial and avoids a writable scratch dir.
 */
class TesseractOcrEngine implements OcrEngine
{
    public function __construct(
        private readonly string $binary,
        private readonly string $language,
        private readonly int $psm,
        private readonly int $timeoutSeconds,
    ) {
    }

    public function extract(string $absolutePath): array
    {
        if (!is_file($absolutePath) || !is_readable($absolutePath)) {
            throw new OcrException("OCR input not readable: {$absolutePath}");
        }

        $process = new Process([
            $this->binary,
            $absolutePath,
            '-',                     // stdout instead of an output file
            '-l', $this->language,
            '--psm', (string) $this->psm,
        ]);
        $process->setTimeout($this->timeoutSeconds);

        try {
            $process->run();
        } catch (ProcessTimedOutException $e) {
            throw new OcrException(
                "Tesseract timed out after {$this->timeoutSeconds}s",
                previous: $e,
            );
        } catch (ProcessFailedException $e) {
            throw new OcrException(
                'Tesseract failed: '.trim($e->getProcess()->getErrorOutput()),
                previous: $e,
            );
        }

        if (!$process->isSuccessful()) {
            throw new OcrException(
                'Tesseract exited non-zero: '.trim($process->getErrorOutput()),
            );
        }

        return [
            'raw_text' => rtrim($process->getOutput()),
            'engine'   => 'tesseract',
            'ran_at'   => Carbon::now()->toIso8601String(),
            'meta'     => [
                'language' => $this->language,
                'psm'      => $this->psm,
            ],
        ];
    }
}
