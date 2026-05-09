<?php

use App\Http\Controllers\Api\V1\FeedbackController;
use App\Http\Controllers\Api\V1\HospitalController;
use App\Http\Controllers\Api\V1\HospitalLogoController;
use App\Http\Controllers\Api\V1\HospitalSignatoryController;
use App\Http\Controllers\Api\V1\MeController;
use App\Http\Controllers\Api\V1\PatientController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\TemplateController;
use App\Http\Controllers\Api\V1\TemplateFieldController;
use App\Http\Controllers\Api\V1\TemplateFieldImageUploadController;
use App\Http\Controllers\Api\V1\TestController;
use App\Http\Controllers\Api\V1\UsersController;
use Illuminate\Support\Facades\Route;

Route::apiResource('templates', TemplateController::class);
Route::apiResource('template-fields', TemplateFieldController::class);
Route::apiResource('patients', PatientController::class);
Route::apiResource('reports', ReportController::class);
Route::apiResource('tests', TestController::class);
Route::apiResource('hospitals', HospitalController::class)->middleware('role:admin');
Route::apiResource('users', UsersController::class)->middleware('role:admin');
Route::post('template-field-images', [TemplateFieldImageUploadController::class, 'store']);
Route::post('hospitals/{hospital}/logo', [HospitalLogoController::class, 'store'])->middleware('role:admin');
Route::delete('hospitals/{hospital}/logo', [HospitalLogoController::class, 'destroy'])->middleware('role:admin');

Route::post('hospitals/{hospital}/secondary-logo', [HospitalLogoController::class, 'storeSecondary'])->middleware('role:admin');
Route::delete('hospitals/{hospital}/secondary-logo', [HospitalLogoController::class, 'destroySecondary'])->middleware('role:admin');


Route::get('hospitals/{hospital}/signatories', [HospitalSignatoryController::class, 'index']);
Route::post('hospitals/{hospital}/signatories', [HospitalSignatoryController::class, 'store'])->middleware('role:admin');
Route::get('hospital-signatories/{hospitalSignatory}', [HospitalSignatoryController::class, 'show']);
Route::patch('hospital-signatories/{hospitalSignatory}', [HospitalSignatoryController::class, 'update'])->middleware('role:admin');
Route::delete('hospital-signatories/{hospitalSignatory}', [HospitalSignatoryController::class, 'destroy'])->middleware('role:admin');
Route::post('hospital-signatories/{hospitalSignatory}/signature-image', [HospitalSignatoryController::class, 'uploadSignatureImage'])->middleware('role:admin');
Route::delete('hospital-signatories/{hospitalSignatory}/signature-image', [HospitalSignatoryController::class, 'deleteSignatureImage'])->middleware('role:admin');

Route::get('me/profile', [MeController::class, 'profile']);
Route::patch('me/profile', [MeController::class, 'updateProfile']);
Route::patch('me/password', [MeController::class, 'updatePassword']);

Route::post('feedback', [FeedbackController::class, 'store']);
Route::get('feedback', [FeedbackController::class, 'index'])->middleware('role:admin');
Route::patch('feedback/{feedbackMessage}', [FeedbackController::class, 'update'])->middleware('role:admin');
