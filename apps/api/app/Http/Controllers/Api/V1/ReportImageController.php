<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\ReportImageResource;
use App\Models\Report;
use App\Models\ReportImage;
use App\Services\Ocr\OcrEngine;
use App\Services\Ocr\OcrException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ReportImageController extends Controller
{
    // GET /api/v1/reports/{report}/images
    public function index(Request $request, Report $report)
    {
        $this->authorizeReportAccess($request, $report);

        return ReportImageResource::collection(
            $report->images()->orderBy('sort_order')->orderBy('id')->get()
        );
    }

    // POST /api/v1/reports/{report}/images
    public function store(Request $request, Report $report)
    {
        $this->authorizeReportAccess($request, $report);

        $v = Validator::make($request->all(), [
            'image'                => ['required', 'file', 'image', 'max:5120'],
            'template_section_key' => ['required', 'string', 'max:255'],
            'include_in_report'    => ['sometimes', 'boolean'],
            'sort_order'           => ['sometimes', 'integer', 'min:0'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $disk = config('filesystems.default');
        $file = $request->file('image');
        $ext = $file->extension() ?: pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION) ?: 'bin';
        $filename = Str::uuid()->toString().'.'.$ext;
        $storedPath = $file->storeAs("reports/{$report->id}", $filename, $disk);

        $row = ReportImage::create([
            'report_id'            => $report->id,
            'template_section_key' => (string) $request->input('template_section_key'),
            'path'                 => $storedPath,
            'original_filename'    => $file->getClientOriginalName(),
            'mime'                 => $file->getMimeType(),
            'size_bytes'           => $file->getSize(),
            'include_in_report'    => $request->boolean('include_in_report', true),
            'sort_order'           => (int) $request->input(
                'sort_order',
                $this->nextSortOrder($report, (string) $request->input('template_section_key'))
            ),
            'uploaded_by_user_id'  => $request->user()?->id,
            'extraction_status'    => config('ocr.enabled') ? 'pending' : 'none',
        ]);

        if (config('ocr.enabled')) {
            $this->runOcr($row, $storedPath);
            $row->refresh();
        }

        return (new ReportImageResource($row))
            ->additional(['meta' => ['status' => 'created']])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Synchronous OCR pass. Resolves the engine binding (which is fakeable
     * in tests), reads the stored file from the default disk, and writes
     * the result back onto the row. Any failure is swallowed into the row's
     * extraction_error so the upload itself still succeeds — the doctor
     * can re-upload or proceed without OCR.
     */
    private function runOcr(ReportImage $row, string $storedPath): void
    {
        $disk    = config('filesystems.default');
        $storage = Storage::disk($disk);

        try {
            // Tesseract needs a real path on the local filesystem. For the
            // `local`/`public` disks we can read the absolute path directly;
            // for remote disks we materialise a temp copy.
            $absolutePath = method_exists($storage, 'path')
                ? $storage->path($storedPath)
                : null;
            $tempPath = null;

            if (!$absolutePath || !is_file($absolutePath)) {
                $tempPath = tempnam(sys_get_temp_dir(), 'ocr-');
                file_put_contents($tempPath, $storage->get($storedPath));
                $absolutePath = $tempPath;
            }

            try {
                $engine = app(OcrEngine::class);
                $result = $engine->extract($absolutePath);
                $row->update([
                    'extraction_status' => 'ready',
                    'extracted_data'    => $result,
                    'extraction_error'  => null,
                ]);
            } finally {
                if ($tempPath && is_file($tempPath)) {
                    @unlink($tempPath);
                }
            }
        } catch (OcrException $e) {
            $row->update([
                'extraction_status' => 'failed',
                'extraction_error'  => $e->getMessage(),
            ]);
            Log::warning('OCR extraction failed', [
                'report_image_id' => $row->id,
                'message'         => $e->getMessage(),
            ]);
        }
    }

    // PATCH /api/v1/report-images/{reportImage}
    public function update(Request $request, ReportImage $reportImage)
    {
        $this->authorizeReportAccess($request, $reportImage->report);

        $v = Validator::make($request->all(), [
            'include_in_report' => ['sometimes', 'boolean'],
            'sort_order'        => ['sometimes', 'integer', 'min:0'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $reportImage->update($v->validated());

        return new ReportImageResource($reportImage->fresh());
    }

    // DELETE /api/v1/report-images/{reportImage}
    public function destroy(Request $request, ReportImage $reportImage)
    {
        $this->authorizeReportAccess($request, $reportImage->report);

        $disk = config('filesystems.default');
        if ($reportImage->path && Storage::disk($disk)->exists($reportImage->path)) {
            Storage::disk($disk)->delete($reportImage->path);
        }
        $reportImage->delete();

        return response()->json([
            'jsonapi' => ['version' => '1.0'],
            'meta'    => ['status' => 'deleted'],
        ], 200);
    }

    private function nextSortOrder(Report $report, string $sectionKey): int
    {
        $max = $report->images()
            ->where('template_section_key', $sectionKey)
            ->max('sort_order');

        return is_numeric($max) ? ((int) $max) + 1 : 0;
    }

    /**
     * Doctor / staff who own the report can manage its images. Admin can
     * manage any report's images. Mirrors the rule used by
     * ReportController@update for metadata edits.
     */
    private function authorizeReportAccess(Request $request, Report $report): void
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }
        if (($user->role ?? null) === 'admin') {
            return;
        }
        if ((int) $report->user_id === (int) $user->id) {
            return;
        }
        abort(403, 'You can only manage images on reports you own.');
    }
}
