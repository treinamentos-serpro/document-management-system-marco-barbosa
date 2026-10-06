async function request(path, userId, options = {}) {
  const owner = userId.trim();
  if (!owner) throw new Error('Informe o identificador do usuário.');

  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: { ...options.headers, 'X-User-Id': owner },
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Não foi possível conectar ao servidor.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || 'Não foi possível concluir a operação.');
  }
  return response;
}

export async function listDocuments(userId, signal) {
  const response = await request('/documents', userId, { signal });
  const { documents } = await response.json();
  return documents;
}

export async function uploadDocument(file, userId, signal) {
  const body = new FormData();
  body.append('file', file);
  const response = await request('/upload', userId, { method: 'POST', body, signal });
  return response.json();
}

export async function downloadDocument(id, userId, signal) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, userId, { signal });
  return response.blob();
}