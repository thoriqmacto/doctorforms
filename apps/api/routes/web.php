<?php

use Illuminate\Support\Facades\Route;

Route::get('/ping', function () {
    return response()->json(['message' => 'pong']);
});

Route::get('/', function () {
    return view('welcome');
});

Route::get('/debug-storage', function () {
    return [
        'default_disk' => config('filesystems.default'),
        'public_exists' => Storage::disk('public')->exists('template-fields/images/sJaHS4AhpG1RvZibLTIJ3Ue0BXGvSopKmJ7f39SH.png'),
        'local_exists' => Storage::disk('local')->exists('template-fields/images/sJaHS4AhpG1RvZibLTIJ3Ue0BXGvSopKmJ7f39SH.png'),
        'public_url' => Storage::disk('public')->url('template-fields/images/sJaHS4AhpG1RvZibLTIJ3Ue0BXGvSopKmJ7f39SH.png'),
    ];
});
