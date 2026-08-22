# SGD — Sistema de Gestão Documental

Ministério dos Transportes, Telecomunicações e Economia Digital da Guiné-Bissau

Resumo para colar como primeira mensagem no Claude Code:

Este é um projeto Laravel (backend, PHP 8.5 em C:\php83) + React/Vite (frontend) para um Sistema de Gestão Documental. Já está a correr localmente com MySQL do XAMPP. Backend em backend/, frontend em frontend/. Já tenho utilizadores de teste criados (perfis RECEP, SECR, MIN) e um documento de teste (SGD-2026-000001) já passou pelos estados Receção → Submetido → Validado (Secretariado), e estou agora a testar o encaminhamento pelo Ministro. Falta testar: encaminhamento, iniciar análise, validar por serviço, arquivar, e rejeição. Também falta implementar o ecrã de 2FA no frontend (desativei temporariamente via SGD_2FA_PERFIS_OBRIGATORIOS vazio no .env). Consulta o README.md para mais contexto.

Este repositório contém o esqueleto funcional do MVP (RF001–RF017), construído a partir dos documentos:

- `Documento de Arquitetura Técnica v1.0`
- `Modelo de Dados / ERD v1.0`
- `Especificação de API REST v1.0`
- `Máquina de Estados do Workflow v1.0`
- `Plano de Segurança v1.0`

## Estado desta entrega

- **Backend (Laravel)** — código-fonte completo (migrações, modelos, motor de workflow,
  policies, controladores, rotas). **Não foi executado neste ambiente**: o sandbox usado
  para o gerar não tem PHP instalado nem acesso à rede do Packagist. Está pronto para
  `composer install` num ambiente normal com internet.
- **Frontend (React + TypeScript + Vite)** — projeto real, criado e testado neste
  ambiente: `npm install`, `npx tsc --noEmit` e `npm run build` foram executados com
  sucesso. Cobre login, listagem/pesquisa de documentos e criação de novo registo.

## Como arrancar com XAMPP (sem Docker)

Se só tiver o XAMPP instalado (Apache + PHP + MySQL), siga este caminho —
não precisa de PostgreSQL, Redis nem MinIO para desenvolvimento local.

1. **Instale o Composer** (o XAMPP não o inclui): descarregue e execute
   `Composer-Setup.exe` em https://getcomposer.org/download/ — o instalador
   deteta automaticamente o PHP do XAMPP. Confirme com `composer --version`.
2. **Instale o Node.js LTS**: https://nodejs.org — necessário para o frontend.
   Confirme com `node -v` e `npm -v`.
3. **Ative as extensões PHP necessárias**: abra
   `C:\xampp\php\php.ini`, remova o `;` do início das linhas
   `extension=pdo_mysql`, `extension=mysqli`, `extension=fileinfo` e
   `extension=curl`, guarde, e reinicie o Apache no painel do XAMPP.
4. **Crie a base de dados**: abra http://localhost/phpmyadmin, crie uma
   base de dados chamada `sgd` com collation `utf8mb4_unicode_ci`.
5. **Configure o backend**:
   ```
   cd backend
   copy .env.xampp.example .env
   composer install
   php artisan key:generate
   php artisan migrate
   php artisan db:seed --class=PerfilSeeder
   php artisan serve
   ```
   A API fica disponível em http://localhost:8000/api/v1.
6. **Configure o frontend** (noutro terminal):
   ```
   cd frontend
   copy .env.example .env
   npm install
   npm run dev
   ```
   A aplicação fica disponível em http://localhost:5173.

Esta variante usa MySQL em vez de PostgreSQL, guarda anexos localmente em
`backend/storage/app/private` em vez de MinIO, e processa filas/sessões em
ficheiro em vez de Redis — o código já está preparado para isso (ver
`backend/.env.xampp.example`). Para produção, mantém-se a recomendação de
PostgreSQL + Redis + MinIO do Documento de Arquitetura Técnica.

> Nota: o XAMPP normalmente já ocupa a porta 3306 (MySQL) e a 80 (Apache).
> Como o Laravel corre com `php artisan serve` na porta 8000 e o Apache do
> XAMPP não precisa de servir este projeto, não há conflito de portas.

## Como arrancar com Docker

### 1. Pré-requisitos

- Docker e Docker Compose
- (Para desenvolvimento fora de contentores) PHP 8.3, Composer, Node.js 22

### 2. Configuração

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edite `backend/.env` e defina palavras-passe fortes para `DB_PASSWORD` e
`AWS_SECRET_ACCESS_KEY` (não usar os valores de exemplo em produção).

### 3. Gerar a APP_KEY do Laravel

Depois de `composer install` dentro do container `backend`:

```bash
docker compose exec backend php artisan key:generate
```

### 4. Subir tudo

```bash
docker compose up --build
```

Isto sobe: PostgreSQL (5432), Redis (6379), MinIO (9000/9001), backend Laravel (8000)
e frontend Vite (5173).

### 5. Popular os 14 perfis

```bash
docker compose exec backend php artisan db:seed --class=PerfilSeeder
```

### 6. Aceder

- Frontend: http://localhost:5173
- API: http://localhost:8000/api/v1
- Consola MinIO: http://localhost:9001

## Próximos passos de desenvolvimento

1. Criar o primeiro utilizador (seeder ou tinker) para poder testar o login.
2. Implementar o ecrã de detalhe do documento (`/documentos/:id`) no frontend —
   consultar histórico, anexar ficheiros, validar/encaminhar/rejeitar/arquivar.
3. Ligar o `AnexoController` a um disco `s3` configurado para o MinIO
   (`config/filesystems.php`) e testar o upload de ponta a ponta.
4. Implementar `App\Notifications\DocumentoEncaminhadoNotification` para
   completar o `NotificarServicoJob` (RF015).
5. Escrever os testes automatizados descritos no `Plano de Testes v1.0`
   (Pest/PHPUnit no backend, Playwright/Cypress no frontend).
6. Configurar CI (GitHub Actions ou equivalente) para correr os testes e o
   `npm run build` / `composer install --no-dev` a cada alteração.

## Estrutura do repositório

```
sgd/
├── docker-compose.yml
├── docker/
│   ├── backend.Dockerfile
│   └── frontend.Dockerfile
├── backend/                  # Laravel 11 (PHP 8.3)
│   ├── app/
│   │   ├── Models/           # Perfil, Utilizador, Documento, Anexo, ...
│   │   ├── Services/         # WorkflowService (máquina de estados)
│   │   ├── Policies/         # DocumentoPolicy (RBAC)
│   │   ├── Jobs/             # NotificarServicoJob
│   │   └── Http/Controllers/Api/
│   ├── database/migrations/
│   ├── database/seeders/
│   └── routes/api.php
└── frontend/                 # React 18 + TypeScript + Vite
    └── src/
        ├── api/               # cliente axios + funções de API
        ├── auth/               # contexto de autenticação + rota protegida
        ├── pages/              # Login, ListaDocumentos, NovoDocumento
        └── types/
```
