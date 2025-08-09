<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TemplateResource;
use App\Models\Template;
use Illuminate\Http\Request;

class TemplateController extends Controller
{
    // GET /api/v1/templates
    public function index(Request $request)
    {
        $query = Template::query();

        if ($request->filled('filter.hospital_id')) {
            $query->where('hospital_id', $request->input('filter.hospital_id'));
        }
        if ($request->filled('filter.test_id')) {
            $query->where('test_id', $request->input('filter.test_id'));
        }
        if ($request->filled('filter.user_id')) {
            $query->where('user_id', $request->input('filter.user_id'));
        }

        $includeFields = str_contains((string) $request->query('include'), 'fields');

        $templates = $query
            ->when($includeFields, fn ($q) => $q->with('fields'))
            ->orderBy('id')
            ->paginate($request->integer('page.size', 25));

        return TemplateResource::collection($templates)
            ->additional([
                'meta' => [
                    'page' => [
                        'size'       => 'A4',
                        'width_mm'   => 210,
                        'height_mm'  => 297,
                        'margins_mm' => ['top' => 12, 'right' => 12, 'bottom' => 12, 'left' => 12],
                    ],
                ],
            ]);
    }

    // GET /api/v1/templates/{template}
    public function show(Request $request, Template $template)
    {
        $includeFields = str_contains((string) $request->query('include'), 'fields');

        if ($includeFields) {
            $template->load('fields');
        }

        return new TemplateResource($template);
    }
}
