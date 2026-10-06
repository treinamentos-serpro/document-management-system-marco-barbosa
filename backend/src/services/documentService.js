function publicMetadata(document) {
  const { id, originalName, size, uploadedAt, owner } = document;
  return { id, originalName, size, uploadedAt, owner };
}

function createDocumentService(repository) {
  return {
    async upload(file, owner) {
      if (!file) {
        const error = new Error('Envie um arquivo no campo file.');
        error.code = 'MISSING_FILE';
        throw error;
      }

      const document = {
        id: file.filename,
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner,
        mimeType: file.mimetype,
      };

      try {
        await repository.save(document);
      } catch (error) {
        await repository.removeFile(document.id).catch(() => {});
        throw error;
      }
      return publicMetadata(document);
    },

    list(owner) {
      return repository.findByOwner(owner)
        .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt)
          || first.id.localeCompare(second.id))
        .map(publicMetadata);
    },

    async download(id, owner) {
      const document = repository.findById(id);
      if (!document || document.owner !== owner) {
        const error = new Error('Documento não encontrado.');
        error.code = 'DOCUMENT_NOT_FOUND';
        throw error;
      }

      return {
        path: await repository.getFilePath(document),
        originalName: document.originalName,
        mimeType: document.mimeType || 'application/octet-stream',
      };
    },
  };
}

module.exports = createDocumentService;