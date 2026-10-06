import { useEffect, useState } from 'react';
import { Files, UserRound } from 'lucide-react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

function DocumentWorkspace({ userId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listDocuments(userId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDocuments(result);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [userId, revision]);

  function refresh() {
    setRevision((current) => current + 1);
  }

  return (
    <>
      <UploadComponent userId={userId} onUploaded={refresh} />
      <DocumentList documents={documents} userId={userId} loading={loading} error={error} onRefresh={refresh} />
    </>
  );
}

export default function App() {
  const [userId, setUserId] = useState('usuario-1');
  const [draftUserId, setDraftUserId] = useState('usuario-1');

  function handleUserChange(event) {
    event.preventDefault();
    if (draftUserId.trim()) setUserId(draftUserId.trim());
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand"><Files size={30} /><div><span className="brand-label">DMS</span><h1>Document Management System</h1></div></div>
        <form className="user-form" onSubmit={handleUserChange}>
          <label htmlFor="user-id">Identificador do usuário</label>
          <div className="user-controls">
            <input id="user-id" value={draftUserId} onChange={(event) => setDraftUserId(event.target.value)} required />
            <button className="icon-button" type="submit" disabled={!draftUserId.trim() || draftUserId.trim() === userId}
              title="Selecionar usuário" aria-label="Selecionar usuário"><UserRound size={18} /></button>
          </div>
        </form>
      </header>
      <DocumentWorkspace key={userId} userId={userId} />
    </main>
  );
}
