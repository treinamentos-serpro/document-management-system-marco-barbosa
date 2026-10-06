---
description: Gera testes com node:test para um módulo do backend.
name: gerar-testes
argument-hint: caminho do módulo (ex. backend/src/services/documentService.js)
agent: agent
---

# Gerar testes do backend

Gere testes automatizados para o módulo `${input:modulo:caminho do modulo}` usando o runner nativo `node:test` e `node:assert`.

Requisitos:

- Cubra os casos de sucesso e de erro principais.
- Mantenha os testes isolados e legíveis.
- Coloque os testes em `backend/test`.
- Siga os padrões de nomes e setup já usados nos testes próximos.
- Não dependa de serviços externos. Use o filesystem local quando necessário.
- Valide com `cd backend && npm test`.
