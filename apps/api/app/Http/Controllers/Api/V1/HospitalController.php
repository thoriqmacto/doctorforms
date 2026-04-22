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
        $hospitals = Hospital::query()
            ->with(self::includesFromRequest($request))
            ->orderBy('id')
            ->paginate($request->integer('page.size', 25));

        return HospitalResource::collection($hospitals);
    }

    // GET /api/v1/hospitals/{hospital}
    public function show(Request $request, Hospital $hospital)
    {
        $hospital->load(self::includesFromRequest($request));

        return new HospitalResource($hospital);
    }

    // POST /api/v1/hospitals
    public function store(Request $request)
    {
        $v = Validator::make($request->all(), self::hospitalRules(required: true));

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
        $v = Validator::make($request->all(), self::hospitalRules(required: false));

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

    /**
     * Supported: ?include=departments,installations,signatories
     * Anything else is ignored so stale clients don't break.
     */
    private static function includesFromRequest(Request $request): array
    {
        $raw = (string) $request->query('include', '');
        if ($raw === '') {
            return [];
        }

        $allowed = ['departments', 'installations', 'signatories'];
        $requested = array_filter(array_map('trim', explode(',', $raw)));

        return array_values(array_intersect($allowed, $requested));
    }

    /**
     * Shared validation rules for store / update. When required=true,
     * the core name/address columns become required (create path).
     * All newer report-identity columns remain optional in both paths.
     */
    private static function hospitalRules(bool $required): array
    {
        $req = $required ? 'required' : 'sometimes';
        return [
            'name'                => [$req, 'string', 'max:255'],
            'short_name'          => ['sometimes', 'nullable', 'string', 'max:100'],
            'parent_org_line'     => ['sometimes', 'nullable', 'string', 'max:255'],
            'address'             => [$required ? 'required' : 'sometimes', 'string', 'max:500'],
            'address_line_1'      => ['sometimes', 'nullable', 'string', 'max:255'],
            'address_line_2'      => ['sometimes', 'nullable', 'string', 'max:255'],
            'province'            => ['sometimes', 'nullable', 'string', 'max:255'],
            'city'                => ['sometimes', 'nullable', 'string', 'max:255'],
            'postal_code'         => ['sometimes', 'nullable', 'string', 'max:20'],
            'country'             => ['sometimes', 'nullable', 'string', 'max:100'],
            'phone'               => ['sometimes', 'nullable', 'string', 'max:50'],
            'fax'                 => ['sometimes', 'nullable', 'string', 'max:50'],
            'whatsapp_phone'      => ['sometimes', 'nullable', 'string', 'max:50'],
            'email'               => ['sometimes', 'nullable', 'email', 'max:255'],
            'website'             => ['sometimes', 'nullable', 'string', 'max:255'],
            'secondary_logo_url'  => ['sometimes', 'nullable', 'string', 'max:500'],
            'accreditation_text'  => ['sometimes', 'nullable', 'string'],
            'report_footer_line'  => ['sometimes', 'nullable', 'string'],
        ];
    }
}
