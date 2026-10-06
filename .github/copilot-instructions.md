# Instruções do projeto - Document Management System (DMS)

Estas instruções são aplicadas automaticamente pelo GitHub Copilot em todas as
interações neste repositório. Use-as como contexto de engenharia para gerar
código consistente com a arquitetura e as convenções do projeto.

## Visão geral

Sistema web para gestão de documentos com:

- Upload de documentos
- Listagem de documentos
- Download de documentos
- Gestão simples por usuário

## Stack

- Backend: Node.js + Express (CommonJS)
- Frontend: React + Vite (ESM)
- Testes backend: runner nativo do Node (`node:test`)
- Frontend requer Node.js 24 ou superior
- Sem TypeScript nesta fase (JavaScript puro)

## Princípios obrigatórios

- SOLID, DRY, KISS, YAGNI
- 12-Factor App (configuração via variáveis de ambiente)
- Código legível tem prioridade sobre código complexo
- Sem overengineering e sem abstrações desnecessárias

## Arquitetura do backend (Clean Architecture simples)

Separe responsabilidades em quatro camadas dentro de `backend/src`:

- `routes/`: definem os endpoints e delegam para os controllers
- `controllers/`: tratam entrada/saída HTTP e validação básica
- `services/`: concentram as regras de negócio
- `repositories/`: cuidam da persistência

Fluxo de dependência: `routes -> controllers -> services -> repositories`.
Camadas internas não conhecem camadas externas.

## Backend

- Mantenha o fluxo `routes -> controllers -> services -> repositories`; `backend/src/app.js` compõe as dependências.
- Os arquivos seguem o padrão camelCase existente, como `documentRoutes.js`, `documentController.js`, `documentService.js` e `documentRepository.js`.
- As operações de documentos exigem `X-User-Id`. Esse valor é apenas contexto fornecido pelo cliente, não autenticação.
- Erros HTTP usam `{ error: { code, message } }`; não exponha caminhos locais nem stack traces.
- Os endpoints atuais são `POST /upload`, `GET /documents` e `GET /documents/:id/download`.

## Armazenamento (restrição importante)

- Os arquivos enviados são gravados no filesystem local da aplicação, na pasta
  `backend/storage`, utilizando `multer` com `diskStorage`.
- Os metadados dos documentos (id, nome original, tamanho, data, dono) ficam em
  memória nesta fase inicial.
- Não utilize provedores de armazenamento externos ou serviços de upload de
  terceiros. O armazenamento é estritamente local à aplicação.
- `PORT`, `STORAGE_DIR` e `MAX_FILE_SIZE` são configuráveis por ambiente; confira os defaults na especificação.
- Reiniciar o backend limpa os metadados em memória, embora os arquivos permaneçam no disco.

## Convenções do frontend

- Componentes funcionais com React Hooks
- Organização baseada em componentes: `components/`, `pages/`, `services/`
- Centralize chamadas `fetch` em `frontend/src/services/` e use o prefixo `/api`; o proxy do Vite o remove antes de encaminhar ao backend.
- Reutilize componentes e evite duplicação

## Estilo de código

- Nomes descritivos em inglês para símbolos de código
- Mensagens ao usuário e comentários em português
- Funções pequenas e com responsabilidade única
- Trate erros nos limites do sistema (entrada HTTP, leitura/escrita de arquivos)

## Restrições gerais

- Não quebrar funcionalidades existentes
- Manter o seed simples e evolutivo
- Preferir dependências já presentes no `package.json`
- Consulte [docs/specs/dms-spec.md](../docs/specs/dms-spec.md) para os contratos esperados, mas confira o código: a especificação não garante que tudo esteja implementado.
- Valide mudanças do backend com `cd backend && npm test`; valide mudanças do frontend com `cd frontend && npm run build` (Node.js 24+). Não há script de lint configurado.
