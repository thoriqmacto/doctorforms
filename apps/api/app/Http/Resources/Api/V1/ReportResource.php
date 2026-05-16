<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\Api\V1\ReportFieldResource;
use App\Http\Resources\Api\V1\MeasurementResource;
use App\Http\Resources\Api\V1\HospitalSignatoryResource;
use App\Http\Resources\Api\V1\ReportImageResource;

class ReportResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'type'       => 'reports',
            'id'         => (string) $this->id,
            'attributes' => [
                'title'        => $this->title,
                'findings'     => $this->findings,
                'conclusion'   => $this->conclusion,
                'operator'     => $this->operator,
                'supervisor'   => $this->supervisor,
                'device'       => $this->device,
                'pdf_url'      => $this->pdf_url,
                'is_completed' => (bool) $this->is_completed,
                'completed_at' => optional($this->completed_at)->toDateTimeString(),
                // 0..100 integer. Computed from filled template fields when
                // the template+fields are loaded; null if we don't have
                // enough context to compute (caller can fall back to "—").
                'completion_percent' => $this->resolveCompletionPercent(),
                // Measurement screenshots / images. Only surfaced when the
                // relation is loaded so we don't fan-out queries on the
                // list endpoint. PR D scope; OCR / parameter extraction is
                // a queued follow-up that uses the extraction_* keys on
                // each row.
                'images'       => $this->when(
                    $this->relationLoaded('images'),
                    fn () => ReportImageResource::collection($this->images)->resolve(),
                ),
                'created_at'   => optional($this->created_at)->toDateTimeString(),
                'updated_at'   => optional($this->updated_at)->toDateTimeString(),
            ],
            'relationships' => [
                'user' => $this->user_id ? [
                    'data' => ['type' => 'users', 'id' => (string) $this->user_id],
                ] : null,
                'signatory' => $this->signatory_id ? [
                    'data' => $this->relationLoaded('signatory') && $this->signatory
                        ? (new HospitalSignatoryResource($this->signatory))->resolve()
                        : ['type' => 'hospital_signatories', 'id' => (string) $this->signatory_id],
                ] : null,
                'hospital' => $this->hospital_id ? [
                    'data' => ['type' => 'hospitals', 'id' => (string) $this->hospital_id],
                ] : null,
                'patient' => $this->patient_id ? [
                    'data' => ['type' => 'patients', 'id' => (string) $this->patient_id],
                ] : null,
                'template' => $this->template_id ? [
                    'data' => ['type' => 'templates', 'id' => (string) $this->template_id],
                ] : null,
                'test' => $this->test_id ? [
                    'data' => ['type' => 'tests', 'id' => (string) $this->test_id],
                ] : null,
                'fields' => [
                    'links' => [
                        'related' => url("/api/v1/reports/{$this->id}?include=fields"),
                    ],
                    'data' => $this->when(
                        $this->relationLoaded('fields'),
                        fn() => ReportFieldResource::collection($this->fields)->resolve()
                    ),
                ],
                'measurements' => [
                    'links' => [
                        'related' => url("/api/v1/reports/{$this->id}?include=measurements"),
                    ],
                    'data' => $this->when(
                        $this->relationLoaded('measurements'),
                        fn() => MeasurementResource::collection($this->measurements)->resolve()
                    ),
                ],
            ],
        ];
    }

    public function with($request)
    {
        return ['jsonapi' => ['version' => '1.0']];
    }

    /**
     * Compute the completion percentage as the fraction of template
     * fields that have a non-empty stored value on this report. Returns
     * null when the template (or its fields relation) is not available
     * so the caller can render "—" instead of a misleading 0%.
     */
    private function resolveCompletionPercent(): ?int
    {
        if ($this->is_completed) {
            return 100;
        }

        $template = $this->relationLoaded('template') ? $this->template : null;
        if (!$template || !$template->relationLoaded('fields')) {
            // Fall back to lazy-loading the template's fields so that the
            // index endpoint's `with('template.fields')` is the only call
            // site that needs to be aware. If the relation can't be loaded
            // (e.g. orphan template), return null.
            try {
                $template = $this->template()->with('fields')->first();
            } catch (\Throwable $e) {
                return null;
            }
            if (!$template) {
                return null;
            }
        }

        $templateFields = $template->fields ?? collect();
        $totalFields = $templateFields->count();
        if ($totalFields === 0) {
            return null;
        }

        $reportFields = $this->relationLoaded('fields') ? $this->fields : $this->fields()->get();
        $filledKeys = $reportFields
            ->filter(fn ($f) => filled(trim((string) $f->value)))
            ->pluck('template_field_id')
            ->map(fn ($id) => (int) $id)
            ->unique();

        $countable = $templateFields->pluck('id')->map(fn ($id) => (int) $id)->unique();
        $matched = $countable->intersect($filledKeys)->count();

        return (int) round(($matched / $totalFields) * 100);
    }
}
