<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\ReportImageResource;
use App\Models\Report;
use App\Models\ReportImage;
use Illuminate\Http\Request;
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
            // Extraction stays in the "none" state until the OCR sprint
            // wires a worker that flips it to pending/processing/ready.
            'extraction_status'    => 'none',
        ]);

        return (new ReportImageResource($row))
            ->additional(['meta' => ['status' => 'created']])
            ->response()
            ->setStatusCode(201);
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
