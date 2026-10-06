---
description: Cria uma camada completa do backend (route, controller, service, repository) para um recurso.
name: scaffold-camada
argument-hint: nome do recurso em camelCase (ex. document)
agent: agent
---

# Scaffold de camada do backend

Crie a estrutura completa de uma camada para o recurso `${input:recurso:nome do recurso}` seguindo a Clean Architecture simples do projeto.

Confira primeiro a especificação em `docs/specs/dms-spec.md` e os módulos existentes. Gere os arquivos em `backend/src`, seguindo os nomes camelCase usados no projeto:

1. `routes/${input:recurso}Routes.js` - define os endpoints e delega ao controller.
2. `controllers/${input:recurso}Controller.js` - trata entrada/saída HTTP e validação básica.
3. `services/${input:recurso}Service.js` - concentra as regras de negócio.
4. `repositories/${input:recurso}Repository.js` - cuida da persistência.

Requisitos:

- Respeite o fluxo `routes -> controllers -> services -> repositories`.
- Só inclua upload quando o recurso exigir recebimento de arquivos; nesse caso, grave no filesystem local com multer `diskStorage` e mantenha metadados em memória.
- Não introduza armazenamento externo.
- Trate erros nos limites do sistema.
- Registre o roteador em `backend/src/app.js` e siga os testes existentes em `backend/test`.
