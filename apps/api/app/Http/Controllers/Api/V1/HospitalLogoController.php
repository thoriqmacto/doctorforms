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
        return $this->storeForSlot($request, $hospital, 'primary');
    }

    public function destroy(Request $request, Hospital $hospital)
    {
        return $this->destroyForSlot($request, $hospital, 'primary');
    }

    public function storeSecondary(Request $request, Hospital $hospital)
    {
        return $this->storeForSlot($request, $hospital, 'secondary');
    }

    public function destroySecondary(Request $request, Hospital $hospital)
    {
        return $this->destroyForSlot($request, $hospital, 'secondary');
    }

    private function storeForSlot(Request $request, Hospital $hospital, string $slot)
    {
        $this->authorize('update', $hospital);

        $request->validate([
            'logo' => [
                'required',
                File::image()->types(['png', 'jpg', 'jpeg', 'webp'])->max(2 * 1024),
            ],
        ]);

        $file = $request->file('logo');
        $disk = config('filesystems.default');

        [$field, $urlField, $filename, $status] = $this->slotMeta($slot);
        $existingPath = $hospital->{$field};
        if ($existingPath && Storage::disk($disk)->exists($existingPath)) {
            Storage::disk($disk)->delete($existingPath);
        }

        $storedPath = $file->storeAs("hospitals/{$hospital->id}", "{$filename}.{$file->extension()}", $disk);
        $hospital->update([$field => $storedPath, $urlField => null]);

        return (new HospitalResource($hospital))
            ->additional(['meta' => ['status' => $status]])
            ->response()
            ->setStatusCode(201);
    }

    private function destroyForSlot(Request $request, Hospital $hospital, string $slot)
    {
        $this->authorize('update', $hospital);

        $disk = config('filesystems.default');
        [$field, $urlField, , $status] = $this->slotMeta($slot);

        $existingPath = $hospital->{$field};
        if ($existingPath && Storage::disk($disk)->exists($existingPath)) {
            Storage::disk($disk)->delete($existingPath);
        }

        $hospital->update([$field => null, $urlField => null]);

        return response()->json(['meta' => ['status' => str_replace('uploaded', 'deleted', $status)]]);
    }

    private function slotMeta(string $slot): array
    {
        return match ($slot) {
            'secondary' => ['secondary_logo_path', 'secondary_logo_url', 'secondary-logo', 'secondary_logo_uploaded'],
            default => ['logo_path', 'logo_url', 'logo', 'logo_uploaded'],
        };
    }
}
