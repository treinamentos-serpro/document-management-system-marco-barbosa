import { FileText, RefreshCw } from 'lucide-react';
import DownloadButton from './DownloadButton.jsx';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const numberFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${numberFormatter.format(bytes / 1024)} KB`;
  return `${numberFormatter.format(bytes / (1024 * 1024))} MB`;
}

export default function DocumentList({ documents, userId, loading, error, onRefresh }) {
  return (
    <section className="documents-section" aria-labelledby="documents-heading" aria-busy={loading}>
      <div className="section-heading">
        <h2 id="documents-heading">Meus documentos <span className="document-count">{documents.length}</span></h2>
        <button className="icon-button" type="button" onClick={onRefresh} disabled={loading}
          aria-label="Atualizar documentos" title="Atualizar documentos">
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
        </button>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      {loading && <p className="list-status" role="status">Carregando documentos…</p>}
      {!loading && !error && documents.length === 0 && (
        <div className="empty-state"><FileText size={32} /><p>Nenhum documento enviado.</p></div>
      )}
      {documents.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead><tr><th scope="col">Documento</th><th scope="col">Tamanho</th><th scope="col">Enviado em</th><th scope="col"><span className="visually-hidden">Download</span></th></tr></thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td><div className="document-name"><FileText size={18} /><span>{document.originalName}</span></div></td>
                  <td className="numeric-cell">{formatSize(document.size)}</td>
                  <td className="date-cell">{dateFormatter.format(new Date(document.uploadedAt))}</td>
                  <td><DownloadButton document={document} userId={userId} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}