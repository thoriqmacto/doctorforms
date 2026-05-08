<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\FeedbackMessageResource;
use App\Models\FeedbackMessage;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
            'page_url' => ['nullable', 'string', 'max:1000'],
        ]);

        $feedbackMessage = FeedbackMessage::create([
            'user_id' => $request->user()->id,
            'message' => $validated['message'],
            'page_url' => $validated['page_url'] ?? null,
            'user_agent' => $request->userAgent(),
        ]);

        return (new FeedbackMessageResource($feedbackMessage->load('user')))
            ->response()
            ->setStatusCode(201);
    }

    public function index()
    {
        $feedback = FeedbackMessage::with('user')->latest()->paginate();

        return FeedbackMessageResource::collection($feedback);
    }

    public function update(Request $request, FeedbackMessage $feedbackMessage)
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:new,reviewed,closed'],
        ]);

        $feedbackMessage->update([
            'status' => $validated['status'],
        ]);

        return new FeedbackMessageResource($feedbackMessage->load('user'));
    }
}
