<?php

use App\Http\Controllers\Api\V1\PatientController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\TemplateController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\TestController;
use App\Http\Controllers\Api\V1\HospitalController;

// When you add auth later, just add ->middleware('auth:sanctum') to this group.
Route::prefix('v1')->group(function () {
    // Auto-register all standard REST API endpoints for templates:
    Route::apiResource('templates', TemplateController::class);
    Route::apiResource('patients', PatientController::class);
    Route::apiResource('reports', ReportController::class);
    Route::apiResource('tests', TestController::class);
    Route::apiResource('hospitals', HospitalController::class);
});
