<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TestResource;
use App\Models\Test;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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

    // GET /api/v1/tests/{test}
    public function show(Test $test)
    {
        return new TestResource($test);
    }

    // POST /api/v1/tests
    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:100', 'unique:tests,code'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
        ]);

        $test = Test::create($validated);

        return (new TestResource($test))
            ->additional(['meta' => ['status' => 'created']])
            ->response()
            ->setStatusCode(201);
    }

    // PUT/PATCH /api/v1/tests/{test}
    public function update(Request $request, Test $test)
    {
        $validated = $request->validate([
            'code' => ['sometimes', 'nullable', 'string', 'max:100', Rule::unique('tests', 'code')->ignore($test->id)],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'nullable', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string'],
        ]);

        $test->update($validated);

        return new TestResource($test);
    }

    // DELETE /api/v1/tests/{test}
    public function destroy(Test $test)
    {
        $test->delete();

        return response()->json([
            'jsonapi' => ['version' => '1.0'],
            'meta' => ['status' => 'deleted'],
        ], 200);
    }
}
