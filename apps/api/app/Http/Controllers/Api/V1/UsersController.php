<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Filters\V1\UserFilter;
use App\Http\Resources\Api\V1\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class UsersController extends ApiController
{
    // GET /api/v1/users
    public function index(UserFilter $filters)
    {
        return UserResource::collection(User::filter($filters)->paginate());
    }

    // GET /api/v1/users/{user}
    public function show(User $user)
    {
        return new UserResource($user);
    }

    // POST /api/v1/users
    public function store(Request $request)
    {
        $v = Validator::make($request->all(), [
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'unique:users,email'],
            'phone'    => ['nullable', 'string', 'max:32', 'unique:users,phone'],
            'position_title' => ['nullable', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $user = User::create([
            'name'     => $request->string('name'),
            'email'    => $request->string('email'),
            'phone'    => $request->input('phone'),
            'position_title' => $request->input('position_title'),
            'password' => $request->string('password'),
        ]);

        return (new UserResource($user))
            ->additional(['meta' => ['status' => 'created']])
            ->response()
            ->setStatusCode(201);
    }

    // PUT/PATCH /api/v1/users/{user}
    public function update(Request $request, User $user)
    {
        $v = Validator::make($request->all(), [
            'name'     => ['sometimes', 'string', 'max:255'],
            'email'    => ['sometimes', 'email', 'unique:users,email,' . $user->id],
            'phone'    => ['sometimes', 'nullable', 'string', 'max:32', 'unique:users,phone,' . $user->id],
            'position_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'password' => ['sometimes', 'string', 'min:8'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $user->update($v->validated());

        return new UserResource($user);
    }

    // DELETE /api/v1/users/{user}
    public function destroy(User $user)
    {
        $user->delete();

        return response()->json([
            'jsonapi' => ['version' => '1.0'],
            'meta'    => ['status' => 'deleted'],
        ], 200);
    }
}
