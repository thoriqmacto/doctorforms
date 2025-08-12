<?php

namespace App\Policies;

use App\Models\Hospital;
use App\Models\User;

class HospitalPolicy
{
    public function update(User $user, Hospital $hospital): bool
    {
        return $hospital->users()->where('users.id', $user->id)->exists();
    }
}
