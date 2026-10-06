---
description: Cria ou atualiza testes de integração para um fluxo da API de documentos usando node:test e as convenções do backend.
name: testar-fluxo-documento
argument-hint: endpoint ou fluxo e comportamento esperado (ex. download de documento de outro usuário retorna 404)
agent: agent
---

# Testar fluxo da API de documentos

Crie ou atualize testes para o fluxo solicitado: `${input:fluxo:descreva o endpoint ou comportamento}`.

Antes de editar:

- Consulte os requisitos correspondentes em `docs/specs/dms-spec.md` e confirme o comportamento atual em `backend/src`.
- Use `backend/test/app.test.js` como referência para os padrões de teste e limpeza de recursos.
- Se a especificação, o pedido e a implementação divergirem, não invente o contrato: descreva a divergência e limite os testes ao comportamento claramente definido.

Requisitos:

- Use `node:test` e `node:assert`, sem dependências externas.
- Para testes HTTP, siga o padrão existente com `app.listen(0)`, `fetch` e APIs nativas como `FormData`/`Blob`; não adicione `supertest`.
- Cubra sucesso e os erros relevantes ao fluxo, verificando status, corpo, cabeçalhos e efeitos no filesystem quando aplicável.
- Mantenha os testes isolados, limpe servidor e arquivos temporários e não altere código de produção.
- Preserve testes e alterações preexistentes; prefira ampliar o arquivo ou setup existente a criar estrutura redundante.
- Execute `cd backend && npm test` e informe o resultado. Se falhar, explique a causa sem enfraquecer o teste para fazê-lo passar.