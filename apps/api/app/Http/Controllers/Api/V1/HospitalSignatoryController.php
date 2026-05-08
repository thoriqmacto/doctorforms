<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\HospitalSignatoryResource;
use App\Models\Hospital;
use App\Models\HospitalSignatory;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Validator as ValidationValidator;

class HospitalSignatoryController extends Controller
{
    public function index(Hospital $hospital)
    {
        $signatories = $hospital->signatories()->with(['user', 'hospital'])->orderBy('id')->get();
        return HospitalSignatoryResource::collection($signatories);
    }

    public function store(Request $request, Hospital $hospital)
    {
        $validated = $this->validatedPayload($request, true);
        $signatory = $hospital->signatories()->create($validated);
        $signatory->load(['user', 'hospital']);
        return (new HospitalSignatoryResource($signatory))->response()->setStatusCode(201);
    }

    public function show(HospitalSignatory $hospitalSignatory)
    {
        return new HospitalSignatoryResource($hospitalSignatory->load(['user', 'hospital']));
    }

    public function update(Request $request, HospitalSignatory $hospitalSignatory)
    {
        $hospitalSignatory->update($this->validatedPayload($request, false));
        return new HospitalSignatoryResource($hospitalSignatory->load(['user', 'hospital']));
    }

    public function destroy(HospitalSignatory $hospitalSignatory)
    {
        if ($hospitalSignatory->signature_image_path) {
            Storage::disk('public')->delete($hospitalSignatory->signature_image_path);
        }
        $hospitalSignatory->delete();
        return response()->json(['meta' => ['status' => 'deleted']], 200);
    }

    public function uploadSignatureImage(Request $request, HospitalSignatory $hospitalSignatory)
    {
        $request->validate(['signature' => ['required', 'file', 'mimetypes:image/png', 'max:2048']]);
        $file = $request->file('signature');

        if ($hospitalSignatory->signature_image_path) {
            Storage::disk('public')->delete($hospitalSignatory->signature_image_path);
        }

        $path = $file->storeAs("hospital-signatories/{$hospitalSignatory->id}", 'signature.png', 'public');
        $hospitalSignatory->update(['signature_image_path' => $path]);

        return new HospitalSignatoryResource($hospitalSignatory->load(['user', 'hospital']));
    }

    public function deleteSignatureImage(HospitalSignatory $hospitalSignatory)
    {
        if ($hospitalSignatory->signature_image_path) {
            Storage::disk('public')->delete($hospitalSignatory->signature_image_path);
        }

        $hospitalSignatory->update(['signature_image_path' => null]);

        return response()->json(['meta' => ['status' => 'signature_deleted']], 200);
    }

    private function validatedPayload(Request $request, bool $required): array
    {
        $rules = [
            'user_id' => $required ? ['required', 'exists:users,id'] : ['sometimes', 'required', 'exists:users,id'],
            'name' => [$required ? 'required' : 'sometimes', 'string', 'max:255'],
            'position_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sip_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'active' => ['sometimes', 'boolean'],
        ];

        $validator = Validator::make($request->all(), $rules);
        $validator->after(function (ValidationValidator $validator) use ($request, $required) {
            $userId = $request->input('user_id');
            if (!$userId) {
                return;
            }

            $user = User::find($userId);
            if ($user && $user->role !== 'doctor') {
                $validator->errors()->add('user_id', 'Selected user must have doctor role.');
            }
            if ($required && $userId) {
                $duplicate = HospitalSignatory::query()
                    ->where('hospital_id', $request->route('hospital')->id)
                    ->where('user_id', $userId)
                    ->exists();

                if ($duplicate) {
                    $validator->errors()->add('user_id', 'This doctor already has a signatory record for this hospital.');
                }
            }

        });
        $validator->validate();

        return $validator->validated();
    }
}
