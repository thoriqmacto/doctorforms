<?php

use App\Http\Controllers\Api\V1\PatientController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\TemplateController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\TestController;

// When you add auth later, just add ->middleware('auth:sanctum') to this group.
Route::prefix('v1')->group(function () {
    // Auto-register all standard REST API endpoints for templates:
    Route::apiResource('templates', TemplateController::class)->only(['index', 'show']);
    Route::apiResource('patients', PatientController::class);
    Route::apiResource('reports', ReportController::class)->only(['index', 'show']);
    Route::apiResource('tests', TestController::class)->only(['index']);
});
