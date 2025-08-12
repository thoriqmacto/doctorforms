<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\HospitalResource;
use App\Models\Hospital;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\File;

class HospitalLogoController extends Controller
{
    public function store(Request $request, Hospital $hospital)
    {
        $this->authorize('update', $hospital);

        $data = $request->validate([
            'logo' => [
                'required',
                File::image()->types(['png','jpg','jpeg','webp'])->max(2 * 1024),
            ],
        ]);

        $file = $request->file('logo');
        $ext = $file->extension();
        $dir = "hospitals/{$hospital->id}";
        $disk = config('filesystems.default');

        if ($hospital->logo_path && Storage::disk($disk)->exists($hospital->logo_path)) {
            Storage::disk($disk)->delete($hospital->logo_path);
        }

        $storedPath = $file->storeAs($dir, "logo.{$ext}", $disk);
        $hospital->update(['logo_path' => $storedPath]);

        return (new HospitalResource($hospital))
            ->additional(['meta' => ['status' => 'logo_uploaded']])
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(Request $request, Hospital $hospital)
    {
        $this->authorize('update', $hospital);

        $disk = config('filesystems.default');
        if ($hospital->logo_path && Storage::disk($disk)->exists($hospital->logo_path)) {
            Storage::disk($disk)->delete($hospital->logo_path);
        }
        $hospital->update(['logo_path' => null]);

        return response()->json(['meta' => ['status' => 'logo_deleted']]);
    }
}
