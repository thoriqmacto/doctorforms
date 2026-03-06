<?php

use App\Http\Controllers\Api\V1\PatientController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\TemplateController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\TestController;
use App\Http\Controllers\Api\V1\HospitalController;
use App\Http\Controllers\Api\V1\UsersController;
use App\Http\Controllers\Api\V1\TemplateFieldController;
use App\Http\Controllers\Api\V1\TemplateFieldImageUploadController;

// When you add auth later, just add ->middleware('auth:sanctum') to this group.
Route::prefix('v1')->group(function () {
    // Auto-register all standard REST API endpoints for templates:
    Route::apiResource('templates', TemplateController::class);
    Route::apiResource('template-fields', TemplateFieldController::class);
    Route::apiResource('patients', PatientController::class);
    Route::apiResource('reports', ReportController::class);
    Route::apiResource('tests', TestController::class);
    Route::apiResource('hospitals', HospitalController::class);
    Route::apiResource('users', UsersController::class);
    Route::post('template-field-images', [TemplateFieldImageUploadController::class, 'store']);
});
