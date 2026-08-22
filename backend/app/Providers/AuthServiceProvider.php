<?php

namespace App\Providers;

use App\Models\Documento;
use App\Policies\DocumentoPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Documento::class => DocumentoPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
