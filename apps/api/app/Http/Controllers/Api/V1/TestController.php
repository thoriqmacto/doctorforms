<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TestResource;
use App\Models\Test;
use Illuminate\Http\Request;

class TestController extends Controller
{
    // GET /api/v1/tests
    public function index(Request $request)
    {
        $tests = Test::query()
            ->orderBy('id')
            ->paginate($request->integer('page.size', 25));

        return TestResource::collection($tests);
    }
}

