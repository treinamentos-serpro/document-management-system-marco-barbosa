import { useEffect, useRef, useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { downloadDocument } from '../services/documentApi.js';

export default function DownloadButton({ document, userId }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const pendingRequest = useRef(null);

  useEffect(() => () => pendingRequest.current?.abort(), []);

  async function handleDownload() {
    if (downloading) return;
    const controller = new AbortController();
    pendingRequest.current = controller;
    setDownloading(true);
    setError('');

    try {
      const blob = await downloadDocument(document.id, userId, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message);
    } finally {
      if (!controller.signal.aborted) setDownloading(false);
    }
  }

  return (
    <div className="download-action">
      <button className="icon-button" type="button" onClick={handleDownload} disabled={downloading}
        title={`Baixar ${document.originalName}`} aria-label={`Baixar ${document.originalName}`}
        aria-busy={downloading}>
        {downloading ? <LoaderCircle className="spin" size={18} /> : <Download size={18} />}
      </button>
      {error && <p className="error-message" role="alert">{error}</p>}
    </div>
  );
}