<?php

namespace App\Models;

use App\Http\Filters\V1\QueryFilter;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'position_title',
        'role',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public $timestamps = true;

    public function getTokenCreatedAtAttribute($tokenId):string
    {
        $token = $this->tokens()->where('id', $tokenId)->first();
        return Carbon::parse($token->created_at)->setTimezone(config('app.timezone'))->toISOString();
    }

    public function getTokenExpiresAtAttribute($tokenId): string
    {
        $token = $this->tokens()->where('id', $tokenId)->first();
        // return Carbon::parse($token->expires_at)->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s');
        return Carbon::parse($token->expires_at)->setTimezone(config('app.timezone'))->toISOString();
    }

    public function scopeFilter(Builder $builder, QueryFilter $filters): Builder
    {
        return $filters->apply($builder);
    }

    /*
     |--------------------------------------------------------------------------
     | Relationships
     |--------------------------------------------------------------------------
     */

    // User can belong to many hospitals (staff)
    public function hospital()
    {
        return $this->belongsToMany(Hospital::class, 'hospital_user');
    }

    // User can own many templates
    public function templates()
    {
        return $this->hasMany(Template::class);
    }

    // User can have many patients
    public function patients()
    {
        return $this->hasMany(Patient::class);
    }

    // User can have many reports
    public function reports()
    {
        return $this->hasMany(Report::class);
    }
}
