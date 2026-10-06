import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Upload } from 'lucide-react';
import { uploadDocument } from '../services/documentApi.js';

export default function UploadComponent({ userId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const pendingRequest = useRef(null);

  useEffect(() => () => pendingRequest.current?.abort(), []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || uploading) return;
    const form = event.currentTarget;
    const controller = new AbortController();
    pendingRequest.current = controller;
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const document = await uploadDocument(file, userId, controller.signal);
      if (controller.signal.aborted) return;
      form.reset();
      setFile(null);
      setSuccess(`Documento "${document.originalName}" enviado.`);
      onUploaded(document);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message);
    } finally {
      if (!controller.signal.aborted) setUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-heading">
      <h2 id="upload-heading">Enviar documento</h2>
      <form className="upload-form" onSubmit={handleSubmit}>
        <div className="file-field">
          <label htmlFor="document-file">Arquivo</label>
          <input id="document-file" name="file" type="file" required disabled={uploading}
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setError('');
              setSuccess('');
            }} />
        </div>
        <button className="primary-button" type="submit" disabled={!file || uploading}>
          {uploading ? <LoaderCircle className="spin" size={18} /> : <Upload size={18} />}
          {uploading ? 'Enviando…' : 'Enviar'}
        </button>
      </form>
      {error && <p className="error-message" role="alert">{error}</p>}
      {success && <p className="success-message" role="status">{success}</p>}
    </section>
  );
}