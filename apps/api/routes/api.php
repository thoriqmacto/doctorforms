<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\V1\HospitalLogoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// generic/unversioned routes
Route::get('/ping', fn() => response()->json(['ok' => true]));

// Load versioned routes (v1), for temporary only without using auth
require __DIR__ . '/api_v1.php';

Route::post('/v1/hospitals/{hospital}/logo', [HospitalLogoController::class, 'store']);
Route::delete('/v1/hospitals/{hospital}/logo', [HospitalLogoController::class, 'destroy']);


//Route::post('/login',[AuthController::class,'login']);
//Route::middleware('auth:sanctum')->post('/logout',[AuthController::class,'logout']);
//Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
//    return $request->user();
//});
