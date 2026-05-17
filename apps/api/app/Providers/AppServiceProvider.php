<?php

namespace App\Providers;

use App\Services\Ocr\OcrEngine;
use App\Services\Ocr\TesseractOcrEngine;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(OcrEngine::class, function () {
            $cfg = (array) config('ocr.tesseract', []);

            return new TesseractOcrEngine(
                binary:          (string) ($cfg['binary'] ?? 'tesseract'),
                language:        (string) ($cfg['language'] ?? 'eng'),
                psm:             (int) ($cfg['psm'] ?? 6),
                timeoutSeconds:  (int) ($cfg['timeout_seconds'] ?? 15),
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token): string {
            $frontendUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/');
            $email = urlencode((string) $notifiable->getEmailForPasswordReset());

            return "{$frontendUrl}/reset-password?token={$token}&email={$email}";
        });
    }
}
