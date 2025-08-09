<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginUserRequest;
use App\Models\User;
use App\Traits\ApiResponses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    use ApiResponses;
    public function login(LoginUserRequest $request){
        $request->validated($request->all());

        if(!Auth::attempt($request->only('email', 'password'))){
            return $this->error('Invalid credentials', 401);
        }

        $user = User::firstwhere('email', $request->email);
        $tokenResult = $user->createToken(
            'API token for ' . $user->email,
            ['*'],
            // now()->addMinute()
            now()->addHour()
        );
        $token = $tokenResult->plainTextToken;
        $tokenId = $tokenResult->accessToken->id;

        return $this->ok(
            'Authenticated',
            [
                'token_id' => $tokenId,
                'token' => $token,
                'token_created_at' => $user->getTokenCreatedAtAttribute($tokenId),
                'token_expires_at' => $user->getTokenExpiresAtAttribute($tokenId),
                'id' => $user->id,
                'email' => $user->email,
            ]
        );
    }

    public function logout(Request $request){
        $request->user()->currentAccessToken()->delete();
        return $this->ok('');
    }
}
