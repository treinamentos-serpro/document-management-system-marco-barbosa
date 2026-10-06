const { test } = require('node:test');
const assert = require('node:assert');
const { mkdtempSync } = require('node:fs');
const { readdir, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');

const storageDirectory = mkdtempSync(path.join(tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_FILE_SIZE = '32';
const app = require('../src/app');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('contratos HTTP dos documentos', async (context) => {
  const server = app.listen(0, '127.0.0.1');
  context.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
    await rm(storageDirectory, { recursive: true, force: true });
  });
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const ownerHeaders = { 'X-User-Id': 'usuario-1' };
  let document;

  function upload(content, field = 'file', headers = ownerHeaders) {
    const form = new FormData();
    form.append(field, new Blob([content], { type: 'text/plain' }), 'relatorio.txt');
    return fetch(`${baseUrl}/upload`, { method: 'POST', headers, body: form });
  }

  await context.test('preserva o health e lista vazia', async () => {
    const health = await fetch(`${baseUrl}/health`);
    assert.deepStrictEqual(await health.json(), { status: 'ok' });
    const response = await fetch(`${baseUrl}/documents`, { headers: ownerHeaders });
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), { documents: [] });
  });

  await context.test('grava localmente e retorna somente metadados públicos', async () => {
    const response = await upload('conteudo do documento');
    assert.strictEqual(response.status, 201);
    document = await response.json();
    assert.deepStrictEqual(Object.keys(document).sort(),
      ['id', 'originalName', 'owner', 'size', 'uploadedAt'].sort());
    assert.match(document.id, /^[0-9a-f-]{36}$/);
    assert.strictEqual(document.originalName, 'relatorio.txt');
    assert.strictEqual(document.owner, 'usuario-1');
    assert.strictEqual(document.size, Buffer.byteLength('conteudo do documento'));
    assert.strictEqual(new Date(document.uploadedAt).toISOString(), document.uploadedAt);
    assert.strictEqual(await readFile(path.join(storageDirectory, document.id), 'utf8'),
      'conteudo do documento');
  });

  await context.test('lista somente documentos do proprietário', async () => {
    const response = await fetch(`${baseUrl}/documents`, { headers: ownerHeaders });
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), { documents: [document] });
    const other = await fetch(`${baseUrl}/documents`, {
      headers: { 'X-User-Id': 'usuario-2' },
    });
    assert.deepStrictEqual(await other.json(), { documents: [] });
  });

  await context.test('download preserva o conteúdo e o nome original', async () => {
    const response = await fetch(`${baseUrl}/documents/${document.id}/download`, {
      headers: ownerHeaders,
    });
    assert.strictEqual(response.status, 200);
    assert.match(response.headers.get('content-disposition'), /attachment;.*relatorio\.txt/);
    assert.match(response.headers.get('content-type'), /text\/plain/);
    assert.strictEqual(await response.text(), 'conteudo do documento');
  });

  await context.test('oculta documentos de outro proprietário como inexistentes', async () => {
    for (const id of [document.id, 'inexistente']) {
      const response = await fetch(`${baseUrl}/documents/${id}/download`, {
        headers: { 'X-User-Id': 'usuario-2' },
      });
      assert.strictEqual(response.status, 404);
      assert.strictEqual((await response.json()).error.code, 'DOCUMENT_NOT_FOUND');
    }
  });

  await context.test('rejeita usuário ausente ou vazio antes de gravar', async () => {
    const before = await readdir(storageDirectory);
    for (const headers of [{}, { 'X-User-Id': '   ' }]) {
      const response = await upload('nao gravar', 'file', headers);
      assert.strictEqual(response.status, 400);
      assert.strictEqual((await response.json()).error.code, 'INVALID_USER');
    }
    for (const endpoint of ['/documents', `/documents/${document.id}/download`]) {
      const response = await fetch(`${baseUrl}${endpoint}`);
      assert.strictEqual(response.status, 400);
      assert.strictEqual((await response.json()).error.code, 'INVALID_USER');
    }
    assert.deepStrictEqual(await readdir(storageDirectory), before);
  });

  await context.test('rejeita upload sem arquivo ou com campo incorreto', async () => {
    const missing = await fetch(`${baseUrl}/upload`, {
      method: 'POST', headers: ownerHeaders, body: new FormData(),
    });
    assert.strictEqual(missing.status, 400);
    assert.strictEqual((await missing.json()).error.code, 'MISSING_FILE');
    const unexpected = await upload('arquivo', 'outro');
    assert.strictEqual(unexpected.status, 400);
    assert.strictEqual((await unexpected.json()).error.code, 'INVALID_UPLOAD');
  });

  await context.test('rejeita arquivo acima do limite sem deixar resíduos', async () => {
    const before = await readdir(storageDirectory);
    const response = await upload('a'.repeat(33));
    assert.strictEqual(response.status, 413);
    assert.strictEqual((await response.json()).error.code, 'FILE_TOO_LARGE');
    assert.deepStrictEqual(await readdir(storageDirectory), before);
  });

  await context.test('rejeita múltiplos arquivos e remove o primeiro arquivo gravado', async () => {
    const before = await readdir(storageDirectory);
    const form = new FormData();
    form.append('file', new Blob(['primeiro']), 'primeiro.txt');
    form.append('file', new Blob(['segundo']), 'segundo.txt');
    const response = await fetch(`${baseUrl}/upload`, {
      method: 'POST', headers: ownerHeaders, body: form,
    });
    assert.strictEqual(response.status, 400);
    assert.strictEqual((await response.json()).error.code, 'INVALID_UPLOAD');
    assert.deepStrictEqual(await readdir(storageDirectory), before);
  });

  await context.test('falha de leitura não expõe caminhos internos', async () => {
    await rm(path.join(storageDirectory, document.id));
    const response = await fetch(`${baseUrl}/documents/${document.id}/download`, {
      headers: ownerHeaders,
    });
    assert.strictEqual(response.status, 500);
    const body = await response.json();
    assert.strictEqual(body.error.code, 'INTERNAL_ERROR');
    assert.ok(!JSON.stringify(body).includes(storageDirectory));
  });
});

test('serviço mantém regras de negócio independentes de HTTP', async (context) => {
  const createDocumentService = require('../src/services/documentService');

  await context.test('ordena a lista e omite dados internos', () => {
    const documents = [
      { id: 'b', originalName: 'b.txt', size: 1, uploadedAt: '2026-10-05T00:00:00.000Z', owner: 'usuario', mimeType: 'text/plain' },
      { id: 'c', originalName: 'c.txt', size: 1, uploadedAt: '2026-10-06T00:00:00.000Z', owner: 'usuario', mimeType: 'text/plain' },
      { id: 'a', originalName: 'a.txt', size: 1, uploadedAt: '2026-10-06T00:00:00.000Z', owner: 'usuario', mimeType: 'text/plain' },
    ];
    const service = createDocumentService({
      findByOwner(owner) {
        assert.strictEqual(owner, 'usuario');
        return [...documents];
      },
    });
    const result = service.list('usuario');
    assert.deepStrictEqual(result.map((document) => document.id), ['a', 'c', 'b']);
    assert.ok(result.every((document) => !Object.hasOwn(document, 'mimeType')));
  });

  await context.test('remove arquivo quando salvar metadados falha', async () => {
    const failure = new Error('Falha de persistência');
    let removedId;
    const service = createDocumentService({
      async save() { throw failure; },
      async removeFile(id) { removedId = id; },
    });
    await assert.rejects(service.upload({
      filename: 'arquivo-id', originalname: 'teste.txt', size: 4, mimetype: 'text/plain',
    }, 'usuario'), (error) => error === failure);
    assert.strictEqual(removedId, 'arquivo-id');
  });

  await context.test('falha na limpeza não substitui o erro original', async () => {
    const failure = new Error('Falha de persistência');
    const service = createDocumentService({
      async save() { throw failure; },
      async removeFile() { throw new Error('Falha de limpeza'); },
    });
    await assert.rejects(service.upload({
      filename: 'arquivo-id', originalname: 'teste.txt', size: 4, mimetype: 'text/plain',
    }, 'usuario'), (error) => error === failure);
  });
});
