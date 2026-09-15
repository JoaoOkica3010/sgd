<?php

namespace App\Console\Commands;

use App\Models\Perfil;
use App\Models\Utilizador;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

/**
 * Comando de apoio para corrigir o login de teste que estava a devolver
 * "Credenciais inválidas." — cria a conta se não existir, ou repõe a
 * password e ativa-a se já existir.
 *
 * Uso:
 *   php artisan sgd:corrigir-login
 *   php artisan sgd:corrigir-login --perfil=CG
 */
class CorrigirLoginJoao extends Command
{
    protected $signature = 'sgd:corrigir-login {--perfil=SADMIN : Sigla do perfil a atribuir (ex.: SADMIN, ADMIN, RECEP, SECR, CG, MIN)}';

    protected $description = 'Cria ou corrige o utilizador de teste joaookica@mtted.gw (repõe a password e ativa a conta).';

    public function handle(): int
    {
        $email = 'joaookica@mtted.gw';
        $senha = 'joaookica123';
        $sigla = strtoupper((string) $this->option('perfil'));

        $perfil = Perfil::where('sigla', $sigla)->first();

        if (! $perfil) {
            $this->error("Perfil '{$sigla}' não existe. Perfis disponíveis:");
            Perfil::orderBy('sigla')->pluck('sigla')->each(fn ($s) => $this->line(" - {$s}"));

            return self::FAILURE;
        }

        $existia = Utilizador::where('email', $email)->exists();

        $utilizador = Utilizador::updateOrCreate(
            ['email' => $email],
            [
                'nome' => 'João Oliveira',
                'password_hash' => Hash::make($senha),
                'perfil_id' => $perfil->id,
                'ativo' => true,
            ]
        );

        $this->info($existia
            ? "Conta existente corrigida: #{$utilizador->id} {$utilizador->email} (perfil {$perfil->sigla})"
            : "Conta criada: #{$utilizador->id} {$utilizador->email} (perfil {$perfil->sigla})");
        $this->line("Pode agora entrar com a password: {$senha}");

        return self::SUCCESS;
    }
}
