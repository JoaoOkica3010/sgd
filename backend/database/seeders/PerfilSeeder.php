<?php

namespace Database\Seeders;

use App\Models\Perfil;
use Illuminate\Database\Seeder;

/** Popula os 14 servicos definidos na seccao 4.1 do Documento de Analise de Requisitos. */
class PerfilSeeder extends Seeder
{
    public function run(): void
    {
        $perfis = [
            ['sigla' => 'RECEP', 'nome_servico' => 'Recepcionista'],
            ['sigla' => 'SECR', 'nome_servico' => 'Secretariado'],
            ['sigla' => 'MIN', 'nome_servico' => 'Ministro'],
            ['sigla' => 'CG', 'nome_servico' => 'Chefe de Gabinete'],
            ['sigla' => 'SG', 'nome_servico' => 'Secretario-Geral'],
            ['sigla' => 'AJ', 'nome_servico' => 'Assessor Juridico'],
            ['sigla' => 'AAP', 'nome_servico' => 'Assessora Administrativa e de Projetos'],
            ['sigla' => 'AIM', 'nome_servico' => 'Assessora de Imprensa'],
            ['sigla' => 'GE', 'nome_servico' => 'Gabinete de Estudos'],
            ['sigla' => 'DGED', 'nome_servico' => 'Direcao Geral de Economia Digital'],
            ['sigla' => 'ITMA', 'nome_servico' => 'Instituto Tecnologico para a Modernizacao Administrativa'],
            ['sigla' => 'DGVTT', 'nome_servico' => 'Direcao Geral de Viacao e Transportes Terrestres'],
            ['sigla' => 'IMP', 'nome_servico' => 'Instituto Maritimo Portuario'],
            ['sigla' => 'ARQ', 'nome_servico' => 'Arquivo'],
        ];

        foreach ($perfis as $perfil) {
            Perfil::updateOrCreate(['sigla' => $perfil['sigla']], $perfil);
        }
    }
}
