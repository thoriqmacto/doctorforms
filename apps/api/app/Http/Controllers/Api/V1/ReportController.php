<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\ReportResource;
use App\Models\Report;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    // GET /api/v1/reports
    public function index(Request $request)
    {
        $reports = Report::with(['patient', 'fields.templateField'])
            ->orderByDesc('id')
            ->paginate($request->integer('page.size', 25))
            ->appends($request->query());

        return ReportResource::collection($reports);
    }

    // GET /api/v1/reports/{report}
    public function show(Report $report)
    {
        $report->load(['patient', 'fields.templateField']);

        return new ReportResource($report);
    }
}
