<?php

return [
    'anexo_tamanho_maximo_mb' => (int) env('SGD_ANEXO_TAMANHO_MAXIMO_MB', 20),
    'disco_anexos' => env('SGD_DISCO_ANEXOS', 'local'),

    /**
     * Endereço pelo qual o SGD é alcançável de fora (ex.: o IP Tailscale
     * da srv-sgd) — usado para construir o link/QR de verificação de
     * assinaturas (VerificacaoController) de forma estável, em vez de
     * depender do endereço que o browser de quem assina calhou usar
     * (que pode ser só acessível na rede local). Sem barra final.
     * Ex.: SGD_URL_PUBLICA=http://100.94.195.117
     */
    'url_publica' => rtrim((string) env('SGD_URL_PUBLICA', ''), '/'),

    /**
     * Caminho para o executável do LibreOffice, usado para converter
     * anexos Word/Excel/PowerPoint em PDF para pré-visualização (ver
     * App\Services\ConversorOfficeService). Se ficar vazio, o serviço
     * tenta localizações habituais consoante o sistema operativo.
     */
    'libreoffice_binario' => env('SGD_LIBREOFFICE_BINARIO'),

    /**
     * Se true (padrão), cada conversão usa um perfil de utilizador do
     * LibreOffice isolado (evita conflitos quando duas pessoas
     * pré-visualizam ao mesmo tempo). Em algumas instalações Windows
     * isto tem causado falhas silenciosas — se a pré-visualização
     * continuar a falhar mesmo com o LibreOffice bem configurado, tente
     * pôr isto a false no .env (SGD_LIBREOFFICE_PERFIL_ISOLADO=false).
     */
    'libreoffice_perfil_isolado' => env('SGD_LIBREOFFICE_PERFIL_ISOLADO', true),

    /**
     * Identidade visual desta instalação. Permite reutilizar a mesma
     * aplicação noutro ministério apenas ajustando o .env — sem tocar em
     * código nem recompilar o frontend (ver ConfigController::index e
     * frontend/src/config/marca.ts).
     */
    'marca' => [
        'sigla_instituicao' => env('SGD_INSTITUICAO_SIGLA', 'MTTED'),
        'subtitulo' => env('SGD_MARCA_SUBTITULO', 'Gestão Documental'),
        'selo' => env('SGD_MARCA_SELO', 'M'),
    ],
];
