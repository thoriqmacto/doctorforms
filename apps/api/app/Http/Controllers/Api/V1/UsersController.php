<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Filters\V1\UserFilter;
use App\Http\Resources\Api\V1\UserResource;
use App\Models\User;

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
}
