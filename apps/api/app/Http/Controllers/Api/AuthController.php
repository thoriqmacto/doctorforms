<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ForgotPasswordRequest;
use App\Http\Requests\Api\LoginUserRequest;
use App\Http\Requests\Api\ResetPasswordRequest;
use App\Models\User;
use App\Traits\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    use ApiResponses;

    public function login(LoginUserRequest $request): JsonResponse
    {
        if (!Auth::attempt($request->only('email', 'password'))) {
            return $this->unauthorized('Invalid credentials');
        }

        /** @var User $user */
        $user = User::query()->firstWhere('email', $request->string('email'));

        $tokenResult = $user->createToken(
            'API token for ' . $user->email,
            ['*'],
            now()->addHours(8)
        );

        $tokenId = $tokenResult->accessToken->id;

        return $this->success([
            'token_id' => $tokenId,
            'token' => $tokenResult->plainTextToken,
            'token_created_at' => $user->getTokenCreatedAtAttribute($tokenId),
            'token_expires_at' => $user->getTokenExpiresAtAttribute($tokenId),
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'position_title' => $user->position_title,
            ],
        ], 'Authenticated');
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return $this->success([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'position_title' => $user->position_title,
        ], 'Authenticated user');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return $this->ok('Logged out');
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $status = Password::sendResetLink($request->only('email'));

        if ($status !== Password::RESET_LINK_SENT) {
            return $this->error(__($status), 422);
        }

        return $this->ok(__($status));
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return $this->error(__($status), 422);
        }

        return $this->ok(__($status));
    }
}
