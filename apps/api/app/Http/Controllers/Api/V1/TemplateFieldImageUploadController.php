<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\File;

class TemplateFieldImageUploadController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'image' => [
                'required',
                File::image()->types(['png'])->max(2 * 1024),
            ],
        ]);

        $disk = 'public';
        $storedPath = $data['image']->store('template-fields/images', $disk);
        $publicUrl = Storage::disk($disk)->url($storedPath);
        $absoluteUrl = url($publicUrl);

        return response()->json([
            'jsonapi' => ['version' => '1.0'],
            'data' => [
                'type' => 'template-field-images',
                'attributes' => [
                    'path' => $storedPath,
                    'url' => $absoluteUrl,
                ],
            ],
            'meta' => ['status' => 'uploaded'],
        ], 201);
    }
}
