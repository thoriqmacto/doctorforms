<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\HospitalResource;
use App\Models\Hospital;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class HospitalController extends Controller
{
    // GET /api/v1/hospitals
    public function index(Request $request)
    {
        $hospitals = Hospital::orderBy('id')
            ->paginate($request->integer('page.size', 25));

        return HospitalResource::collection($hospitals);
    }

    // GET /api/v1/hospitals/{hospital}
    public function show(Hospital $hospital)
    {
        return new HospitalResource($hospital);
    }

    // POST /api/v1/hospitals
    public function store(Request $request)
    {
        $v = Validator::make($request->all(), [
            'name'    => ['required','string','max:255'],
            'address' => ['required','string','max:500'],
            'phone'   => ['nullable','string','max:50'],
            'email'   => ['nullable','email','max:255'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $hospital = Hospital::create($v->validated());

        return (new HospitalResource($hospital))
            ->additional(['meta' => ['status' => 'created']])
            ->response()
            ->setStatusCode(201);
    }

    // PUT/PATCH /api/v1/hospitals/{hospital}
    public function update(Request $request, Hospital $hospital)
    {
        $v = Validator::make($request->all(), [
            'name'    => ['sometimes','string','max:255'],
            'address' => ['sometimes','string','max:500'],
            'phone'   => ['sometimes','nullable','string','max:50'],
            'email'   => ['sometimes','nullable','email','max:255'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $hospital->update($v->validated());

        return new HospitalResource($hospital);
    }

    // DELETE /api/v1/hospitals/{hospital}
    public function destroy(Hospital $hospital)
    {
        $hospital->delete();

        return response()->json([
            'jsonapi' => ['version' => '1.0'],
            'meta'    => ['status' => 'deleted'],
        ], 200);
    }
}
