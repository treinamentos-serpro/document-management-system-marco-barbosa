const { Router } = require('express');
const multer = require('multer');
const { randomUUID } = require('node:crypto');

function createDocumentRouter(controller, { storageDirectory, maxFileSize }) {
  const router = Router();
  const upload = multer({
    storage: multer.diskStorage({
      destination: storageDirectory,
      filename(req, file, callback) {
        callback(null, randomUUID());
      },
    }),
    limits: { fileSize: maxFileSize },
  });

  router.post('/upload', controller.validateUser, upload.single('file'), controller.upload);
  router.get('/documents', controller.validateUser, controller.list);
  router.get('/documents/:id/download', controller.validateUser, controller.download);
  router.use(controller.handleError);

  return router;
}

module.exports = createDocumentRouter;