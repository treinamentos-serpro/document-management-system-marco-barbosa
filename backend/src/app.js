const express = require('express');
const path = require('node:path');
const createDocumentRepository = require('./repositories/documentRepository');
const createDocumentService = require('./services/documentService');
const createDocumentController = require('./controllers/documentController');
const createDocumentRouter = require('./routes/documentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const storageDirectory = path.resolve(__dirname, '..', process.env.STORAGE_DIR || 'storage');
const maxFileSize = Number(process.env.MAX_FILE_SIZE ?? 10485760);
if (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0) {
  throw new Error('MAX_FILE_SIZE deve ser um inteiro positivo em bytes.');
}

const repository = createDocumentRepository(storageDirectory);
const service = createDocumentService(repository);
const controller = createDocumentController(service);

app.use(express.json());
app.use(createDocumentRouter(controller, { storageDirectory, maxFileSize }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
