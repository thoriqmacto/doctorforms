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
        $q = Patient::query()->with(['hospital', 'user']);

        // Accept both `filter[xxx]` and the legacy flat-key `filter.xxx`
        // style. See ReportController for the reasoning.
        $f = function (string $key) use ($request) {
            $bracket = $request->input("filter.$key");
            if ($bracket !== null && $bracket !== '') {
                return $bracket;
            }
            $flat = $request->input("filter_$key");
            if ($flat !== null && $flat !== '') {
                return $flat;
            }
            return null;
        };

        if (!is_null($f('hospital_id'))) {
            $q->where('hospital_id', (int) $f('hospital_id'));
        }
        if (!is_null($f('user_id'))) {
            $q->where('user_id', (int) $f('user_id'));
        }
        if (!is_null($f('mrn'))) {
            $q->where('mrn', 'like', '%'.$f('mrn').'%');
        }
        if (!is_null($f('name'))) {
            $q->where('name', 'like', '%'.$f('name').'%');
        }
        if (!is_null($f('gender'))) {
            $q->where('gender', strtolower((string) $f('gender')));
        }
        if (!is_null($f('q'))) {
            $needle = trim((string) $f('q'));
            if ($needle !== '') {
                $q->where(function ($w) use ($needle) {
                    $w->where('name', 'like', "%{$needle}%")
                        ->orWhere('mrn', 'like', "%{$needle}%")
                        ->orWhereHas('hospital', fn ($h) => $h->where('name', 'like', "%{$needle}%"))
                        ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$needle}%"));
                });
            }
        }

        $sort = (string) $request->input('sort', '-updated_at');
        $allowed = ['id', 'name', 'mrn', 'updated_at', 'created_at', 'dos'];
        $field = ltrim($sort, '-');
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        if (!in_array($field, $allowed, true)) {
            $field = 'updated_at';
            $direction = 'desc';
        }
        $q->orderBy($field, $direction);

        $patients = $q
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

        $payload = $v->validated();
        $payload['gender'] = strtolower((string) $payload['gender']);
        $payload['mrn']    = (string) $payload['mrn'];
        $payload['name']   = (string) $payload['name'];

        $patient = Patient::create($payload);

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
