<?php

namespace App\Exceptions;

use Exception;

class TransicaoInvalidaException extends Exception
{
    public function __construct(string $mensagem = 'Transição de estado não permitida.')
    {
        parent::__construct($mensagem, 409);
    }
}
