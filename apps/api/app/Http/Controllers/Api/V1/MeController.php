<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class MeController extends Controller
{
    public function profile(Request $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();

        return new UserResource($user);
    }

    public function updateProfile(Request $request): JsonResponse|UserResource
    {
        /** @var User $user */
        $user = $request->user();

        if ($request->has('role')) {
            return response()->json([
                'status' => 'error',
                'errors' => [
                    'role' => ['Role can only be changed by an administrator.'],
                ],
            ], 422);
        }

        $v = Validator::make($request->all(), [
            'name'           => ['sometimes', 'string', 'max:255'],
            'email'          => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'phone'          => ['sometimes', 'nullable', 'string', 'max:32', Rule::unique('users', 'phone')->ignore($user->id)],
            'position_title' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $user->update($v->validated());

        return new UserResource($user);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $v = Validator::make($request->all(), [
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        if (!Hash::check($request->input('current_password'), $user->password)) {
            return response()->json([
                'status' => 'error',
                'errors' => [
                    'current_password' => ['Current password is incorrect.'],
                ],
            ], 422);
        }

        $user->update(['password' => $request->input('password')]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Password updated.',
        ]);
    }
}
