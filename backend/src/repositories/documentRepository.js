const { mkdirSync } = require('node:fs');
const { stat, unlink } = require('node:fs/promises');
const path = require('node:path');

function createDocumentRepository(storageDirectory) {
  mkdirSync(storageDirectory, { recursive: true });
  const documents = new Map();

  return {
    async save(document) {
      documents.set(document.id, document);
      return document;
    },

    findById(id) {
      return documents.get(id);
    },

    findByOwner(owner) {
      return [...documents.values()].filter((document) => document.owner === owner);
    },

    async getFilePath(document) {
      const filePath = path.join(storageDirectory, document.id);
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) {
        throw new Error('O documento não corresponde a um arquivo.');
      }
      return filePath;
    },

    async removeFile(id) {
      await unlink(path.join(storageDirectory, id));
    },
  };
}

module.exports = createDocumentRepository;