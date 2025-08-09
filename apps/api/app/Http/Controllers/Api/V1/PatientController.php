<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\PatientResource;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PatientController extends Controller
{
    // GET /api/v1/patients
    public function index(Request $request)
    {
        $q = Patient::query();

        // Simple filters
        if ($request->filled('filter.hospital_id')) {
            $q->where('hospital_id', $request->integer('filter.hospital_id'));
        }
        if ($request->filled('filter.user_id')) {
            $q->where('user_id', $request->integer('filter.user_id'));
        }
        if ($request->filled('filter.mrn')) {
            $q->where('mrn', 'like', '%'.$request->input('filter.mrn').'%');
        }
        if ($request->filled('filter.name')) {
            $q->where('name', 'like', '%'.$request->input('filter.name').'%');
        }
        if ($request->filled('filter.gender')) {
            // your SQLite CHECK likely expects lowercase
            $q->where('gender', strtolower($request->input('filter.gender')));
        }

        $patients = $q->orderByDesc('id')
            ->paginate($request->integer('page.size', 25))
            ->appends($request->query());

        return PatientResource::collection($patients);
    }

    // GET /api/v1/patients/{patient}
    public function show(Patient $patient)
    {
        return new PatientResource($patient);
    }

    // POST /api/v1/patients
    public function store(Request $request)
    {
        $v = Validator::make($request->all(), [
            'mrn'                 => ['required','string','max:50'],
            'name'                => ['required','string','max:255'],
            'gender'              => ['required','in:male,female'], // match your CHECK
            'dob'                 => ['nullable','date'],            // 'YYYY-MM-DD'
            'dos'                 => ['nullable','string','max:20'], // keep string if that’s your schema
            'age'                 => ['nullable','integer','min:0','max:150'],
            'height_cm'           => ['nullable','integer','min:0','max:300'],
            'weight_kg'           => ['nullable','integer','min:0','max:500'],
            'bsa'                 => ['nullable','numeric','min:0','max:4'],
            'blood_pressure'      => ['nullable','string','max:15'], // e.g., "120/80"
            'diagnosis_brief'     => ['nullable','string','max:500'],
            'referring_physician' => ['nullable','string','max:255'],
            'hospital_id'         => ['required','integer','exists:hospitals,id'],
            'user_id'             => ['required','integer','exists:users,id'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        // Normalize gender to lowercase for SQLite CHECK
        $gender = strtolower((string) $request->input('gender'));

        $patient = Patient::create([
            'mrn'                 => $request->string('mrn'),
            'name'                => $request->string('name'),
            'gender'              => $gender,
            'dob'                 => $request->input('dob'),
            'dos'                 => $request->input('dos'),
            'age'                 => $request->input('age'),
            'height_cm'           => $request->input('height_cm'),
            'weight_kg'           => $request->input('weight_kg'),
            'bsa'                 => $request->input('bsa'),
            'blood_pressure'      => $request->input('blood_pressure'),
            'diagnosis_brief'     => $request->input('diagnosis_brief'),
            'referring_physician' => $request->input('referring_physician'),
            'hospital_id'         => $request->input('hospital_id'),
            'user_id'             => $request->input('user_id'),
        ]);

        return (new PatientResource($patient))
            ->additional(['meta' => ['status' => 'created']])
            ->response()
            ->setStatusCode(201);
    }

    // PUT/PATCH /api/v1/patients/{patient}
    public function update(Request $request, Patient $patient)
    {
        $v = Validator::make($request->all(), [
            'mrn'                 => ['sometimes','string','max:50'],
            'name'                => ['sometimes','string','max:255'],
            'gender'              => ['sometimes','in:male,female'],
            'dob'                 => ['sometimes','nullable','date'],
            'dos'                 => ['sometimes','nullable','string','max:20'],
            'age'                 => ['sometimes','nullable','integer','min:0','max:150'],
            'height_cm'           => ['sometimes','nullable','integer','min:0','max:300'],
            'weight_kg'           => ['sometimes','nullable','integer','min:0','max:500'],
            'bsa'                 => ['sometimes','nullable','numeric','min:0','max:4'],
            'blood_pressure'      => ['sometimes','nullable','string','max:15'],
            'diagnosis_brief'     => ['sometimes','nullable','string','max:500'],
            'referring_physician' => ['sometimes','nullable','string','max:255'],
            'hospital_id'         => ['sometimes','integer','exists:hospitals,id'],
            'user_id'             => ['sometimes','integer','exists:users,id'],
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $payload = $v->validated();

        if (isset($payload['gender'])) {
            $payload['gender'] = strtolower((string) $payload['gender']);
        }

        $patient->update($payload);

        return new PatientResource($patient);
    }

    // DELETE /api/v1/patients/{patient}
    public function destroy(Patient $patient)
    {
        $patient->delete();

        return response()->json([
            'jsonapi' => ['version' => '1.0'],
            'meta'    => ['status' => 'deleted'],
        ], 200);
    }
}
