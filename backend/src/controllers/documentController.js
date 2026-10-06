function createDocumentController(service) {
  return {
    validateUser(req, res, next) {
      const owner = req.get('X-User-Id')?.trim();
      if (!owner) {
        return res.status(400).json({
          error: { code: 'INVALID_USER', message: 'Informe o cabeçalho X-User-Id.' },
        });
      }
      req.owner = owner;
      next();
    },

    async upload(req, res) {
      res.status(201).json(await service.upload(req.file, req.owner));
    },

    list(req, res) {
      res.json({ documents: service.list(req.owner) });
    },

    async download(req, res, next) {
      const file = await service.download(req.params.id, req.owner);
      res.download(file.path, file.originalName, {
        headers: { 'Content-Type': file.mimeType },
      }, (error) => {
        if (error) next(error);
      });
    },

    handleError(error, req, res, next) {
      if (res.headersSent) return next(error);

      let status = 500;
      let code = 'INTERNAL_ERROR';
      let message = 'Não foi possível concluir a operação.';

      if (error.code === 'MISSING_FILE') {
        status = 400;
        code = 'MISSING_FILE';
        message = 'Envie um arquivo no campo file.';
      } else if (error.code === 'DOCUMENT_NOT_FOUND') {
        status = 404;
        code = 'DOCUMENT_NOT_FOUND';
        message = 'Documento não encontrado.';
      } else if (error.name === 'MulterError') {
        status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        code = status === 413 ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD';
        message = status === 413
          ? 'O arquivo excede o limite permitido.'
          : 'Envie apenas um arquivo no campo file.';
      } else if (req.path === '/upload' && error.message === 'Unexpected end of form') {
        status = 400;
        code = 'INVALID_UPLOAD';
        message = 'O envio do arquivo está incompleto.';
      }

      res.status(status).json({ error: { code, message } });
    },
  };
}

module.exports = createDocumentController;