# Especificação - Document Management System

Esta especificação define o comportamento esperado da primeira versão do
Document Management System (DMS). Ela orienta a implementação futura; não
representa funcionalidades já presentes no seed.

## 1. Objetivo

Permitir que usuários enviem, listem e baixem seus documentos, armazenando os
arquivos no filesystem local e mantendo os metadados em memória.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos associados ao usuário informado na requisição.
- Download de um documento por identificador, respeitando seu proprietário.
- Armazenamento de arquivos local com `multer` e `diskStorage`.
- Persistência temporária dos metadados em memória durante a execução do
  processo.
- Interface React para upload, listagem e download, consumindo a API via
  `fetch` e o prefixo `/api` do proxy do Vite.

### Fora do escopo

- Armazenamento externo, em nuvem ou em banco de dados.
- Persistência dos metadados após reinício do processo.
- Versionamento, edição, exclusão ou compartilhamento de documentos.
- Cadastro de usuários, autenticação e autorização formal.
- Upload de múltiplos arquivos em uma única requisição.
- Garantia de disponibilidade ou replicação dos arquivos.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento por vez. | Um arquivo válido enviado como `file` é salvo localmente e retorna seus metadados com HTTP `201`. |
| RF-02 | O usuário deve informar seu identificador em `X-User-Id`. | Requisições sem identificador ou com valor vazio são rejeitadas; espaços externos são removidos. |
| RF-03 | O sistema associa cada documento ao identificador do usuário que realizou o upload. | O campo `owner` da resposta corresponde ao `X-User-Id` da requisição. |
| RF-04 | O usuário pode listar seus documentos. | A resposta contém somente documentos cujo `owner` corresponde ao `X-User-Id`; a lista é ordenada do mais recente para o mais antigo. |
| RF-05 | O usuário pode baixar um documento pelo identificador. | O conteúdo binário é retornado somente quando o documento existe e pertence ao `X-User-Id`. |
| RF-06 | O sistema informa erros de entrada e de recurso inexistente em formato consistente. | Respostas de erro seguem o contrato definido na seção 6, sem expor caminhos internos ou stack traces. |
| RF-07 | A interface permite selecionar e enviar um arquivo, consultar a lista do usuário e iniciar o download de um item. | A interface apresenta estados de carregamento, sucesso e erro para as operações da API. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são gravados exclusivamente no filesystem local da aplicação usando `multer` com `diskStorage`, por padrão em `backend/storage`. |
| RNF-02 | Os metadados são mantidos em memória; reiniciar o backend apaga o índice e torna os arquivos existentes indisponíveis pela API. |
| RNF-03 | A configuração operacional é obtida de variáveis de ambiente, com defaults documentados nesta especificação. |
| RNF-04 | O backend segue a Clean Architecture simples: `routes -> controllers -> services -> repositories`. Dependências apontam para dentro; regras de negócio não dependem de Express ou de detalhes HTTP. |
| RNF-05 | A aplicação deve limitar o tamanho do upload, por padrão a 10 MiB, configurável por ambiente. |
| RNF-06 | O nome físico do arquivo é gerado pelo sistema a partir do identificador do documento; o nome fornecido pelo usuário nunca é usado como caminho de armazenamento. |
| RNF-07 | Erros não devem revelar caminhos locais, conteúdo de arquivos, stack traces ou dados de outros usuários. |
| RNF-08 | A solução usa Node.js/Express em CommonJS no backend, React/Vite em ESM no frontend e o runner nativo `node:test` para testes backend. |

### Configuração

| Variável | Default | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local usado pelo `diskStorage`. Um caminho relativo deve ser resolvido a partir da raiz do backend, não do diretório corrente do processo. |
| `MAX_FILE_SIZE` | `10485760` | Tamanho máximo permitido por arquivo, em bytes (10 MiB). Valores devem ser inteiros positivos. |

Variáveis inválidas devem impedir a inicialização ou gerar um erro de
configuração claro, sem iniciar o servidor com um limite ou caminho inesperado.
O diretório configurado deve existir ou ser criado pela aplicação durante a
inicialização.

## 5. Modelo de dados

### Metadados públicos do documento

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único, opaco e não previsível, gerado pelo servidor. |
| `originalName` | string | Nome original informado no upload, preservado apenas como metadado. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora de recebimento em ISO 8601 UTC. |
| `owner` | string | Identificador do usuário recebido em `X-User-Id`. |

### Metadados internos de persistência

O repositório pode manter, além dos campos públicos, os dados necessários para
localizar e servir o arquivo, como nome físico gerado e tipo MIME detectado ou
fornecido pelo upload. Esses dados não são expostos nas respostas JSON. O
caminho absoluto ou relativo no filesystem nunca é retornado pela API.

O nome original deve ser preservado para exibição e `Content-Disposition`, mas
nunca deve determinar o nome ou o caminho físico. A resposta de download deve
tratar caracteres especiais do nome de forma segura.

### Identidade e propriedade

Nesta versão, `X-User-Id` é um identificador de contexto, não uma credencial.
Qualquer cliente pode enviar outro valor; portanto, esse mecanismo serve apenas
para o cenário de desenvolvimento/protótipo e não constitui isolamento seguro
para produção. A introdução de autenticação e derivação do proprietário a
partir de uma identidade autenticada é uma evolução fora do escopo atual.

## 6. Contratos de API

Os caminhos abaixo são relativos ao backend. Durante o desenvolvimento, o
frontend os consome com o prefixo `/api`, removido pelo proxy do Vite; por
exemplo, `/api/documents` é encaminhado como `/documents`.

Todas as operações de documentos exigem o cabeçalho:

```http
X-User-Id: identificador-do-usuario
```

O valor é texto não vazio depois de remover espaços externos. As respostas de
erro JSON usam o formato:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Descrição segura para o cliente."
  }
}
```

### `POST /upload`

- **Finalidade:** gravar um arquivo e registrar seus metadados para o usuário.
- **Content-Type:** `multipart/form-data`.
- **Campo obrigatório:** `file`, contendo exatamente um arquivo.
- **Cabeçalho obrigatório:** `X-User-Id`.
- **Sucesso:** HTTP `201 Created`, `application/json`, corpo com os metadados
  públicos do documento criado:

```json
{
  "id": "identificador-opaco",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-10-06T12:00:00.000Z",
  "owner": "usuario-123"
}
```

- **Erros:** `400 MISSING_FILE` se o campo não for enviado; `400 INVALID_USER`
  se `X-User-Id` estiver ausente ou vazio; `413 FILE_TOO_LARGE` se o limite for
  excedido; `500 INTERNAL_ERROR` para falha inesperada no armazenamento ou no
  registro dos metadados.
- Se o arquivo for gravado, mas o registro dos metadados falhar, o backend deve
  tentar remover o arquivo gravado para evitar órfãos.

### `GET /documents`

- **Finalidade:** listar os documentos do usuário informado.
- **Cabeçalho obrigatório:** `X-User-Id`.
- **Sucesso:** HTTP `200 OK`, `application/json`:

```json
{
  "documents": [
    {
      "id": "identificador-opaco",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-10-06T12:00:00.000Z",
      "owner": "usuario-123"
    }
  ]
}
```

- A lista vazia é representada por `{"documents": []}`. A ordenação é
  decrescente por `uploadedAt`; em caso de empate, a implementação deve manter
  uma ordenação determinística.
- **Erros:** `400 INVALID_USER` para cabeçalho ausente ou vazio; `500
  INTERNAL_ERROR` para falha inesperada.

### `GET /documents/:id/download`

- **Finalidade:** baixar o arquivo associado ao identificador.
- **Cabeçalho obrigatório:** `X-User-Id`.
- **Sucesso:** HTTP `200 OK`, corpo binário do arquivo, `Content-Type` adequado
  ao arquivo (ou `application/octet-stream` quando desconhecido) e
  `Content-Disposition: attachment` com o nome original tratado com segurança.
- **Erros:** `400 INVALID_USER` para cabeçalho ausente ou vazio; `404
  DOCUMENT_NOT_FOUND` quando o identificador não existe ou pertence a outro
  usuário. As duas situações devem ser indistinguíveis para o cliente; `500
  INTERNAL_ERROR` para falha de leitura.

### Verificação de saúde existente

O seed expõe `GET /health`, com HTTP `200` e `{ "status": "ok" }`. Ele pode
ser mantido como verificação operacional e não substitui os contratos acima.

## 7. Decisões arquiteturais

### Backend

- `routes/`: declara os caminhos e conecta middleware/controller, sem regra de
  negócio.
- `controllers/`: traduz HTTP para chamadas de serviço, valida dados de
  entrada no limite HTTP e traduz resultados/erros para status e respostas.
- `services/`: aplica regras de negócio, como propriedade do documento,
  consistência do upload e comportamento de listagem/download, sem conhecer
  Express.
- `repositories/`: encapsula gravação/leitura no filesystem local e acesso ao
  índice de metadados em memória. A implementação deve obedecer à restrição
  `multer` + `diskStorage`; não deve introduzir banco ou serviço externo.
- A composição do app conecta as camadas. A configuração é lida de variáveis
  de ambiente e injetada onde necessária, evitando dependência global em regras
  de negócio.
- Middleware de upload deve limitar tamanho, tratar o formato de erro do
  Multer e garantir que arquivos incompletos ou rejeitados não permaneçam no
  diretório de armazenamento.

### Frontend

- Componentes funcionais React separados para seleção/upload, listagem e ação
  de download, conforme as convenções existentes.
- A comunicação fica em `services/`, usando `fetch` para `/api/upload`,
  `/api/documents` e `/api/documents/:id/download`.
- O identificador de usuário necessário deve ser fornecido pelo contexto simples
  definido para a aplicação e enviado em `X-User-Id`. Não há tela ou fluxo de
  autenticação nesta versão.
- A interface deve refletir os estados de carregamento, lista vazia, sucesso e
  falha, sem apresentar detalhes internos do servidor.

## 8. Plano de execução

As etapas abaixo são uma sequência futura de implementação e validação. Esta
especificação não executa nem solicita alterações nos arquivos de backend ou
frontend.

1. Confirmar as decisões pendentes de identidade do usuário, limite de upload,
   política de tipos MIME e comportamento operacional após reinicialização.
2. Implementar a configuração e as camadas de backend na ordem de dependência:
   repositórios, serviços, controllers e routes; integrar `multer` com
   `diskStorage` e garantir limpeza em falhas.
3. Cobrir os contratos com testes `node:test`: upload válido/inválido,
   limite de tamanho, listagem por proprietário, download autorizado,
   documento inexistente ou de outro proprietário e falhas de filesystem.
4. Implementar o consumo da API no frontend, componentes de upload, listagem e
   download e seus estados de erro/carregamento.
5. Validar a integração pelo proxy `/api`, executar build do frontend e testes
   do backend, e atualizar README/documentação operacional quando necessário.

## 9. Critérios de aceite da versão

- Upload grava o arquivo no diretório local configurado e retorna os metadados
  públicos com `201`.
- Nenhuma entrada do usuário é usada diretamente como caminho de filesystem.
- Listagem e download respeitam o `owner` recebido em `X-User-Id`.
- Download de documento inexistente e de outro proprietário retorna o mesmo
  `404`.
- Upload acima do limite configurado é rejeitado sem deixar arquivo parcial.
- Reiniciar o backend não restaura os metadados; essa limitação está documentada
  e é aceita nesta fase.
- Testes automatizados cobrem os contratos e o tratamento dos principais
  erros; o frontend consegue consumir os endpoints pelo proxy configurado.

## 10. Riscos e decisões pendentes

- `X-User-Id` não autentica o usuário. Não usar o mecanismo como controle de
  acesso em produção sem autenticação confiável.
- O índice em memória se perde ao reiniciar o processo, embora os arquivos
  permaneçam no disco. Recuperação, limpeza de órfãos e persistência de
  metadados não fazem parte desta versão.
- O limite de 10 MiB é um default inicial; deve ser confirmado para o uso
  esperado.
- A política de tipos MIME/extensões ainda não restringe formatos. Caso seja
  necessária, deve ser definida antes de implementar a validação para evitar
  divergência entre extensão, MIME declarado e conteúdo real.
- O comportamento para falta de espaço, permissões insuficientes e indisponibilidade
  do diretório deve resultar em erro controlado, sem expor detalhes internos.