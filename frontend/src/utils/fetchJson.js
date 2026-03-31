/**
 * Fetch helper that won't throw JSON parse errors when the server returns HTML.
 * Returns parsed JSON when possible; otherwise surfaces a clear error message.
 */
export async function fetchJson(url, options) {
  const response = await fetch(url, options);

  const contentType = response.headers.get('content-type') || '';
  const looksJson = contentType.includes('application/json') || contentType.includes('+json');

  let body;
  if (looksJson) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    const messageFromJson = body && typeof body === 'object' ? body.message : null;

    let message = messageFromJson || `Request failed (${response.status} ${response.statusText})`;

    if (!looksJson) {
      const snippet = typeof body === 'string' ? body.slice(0, 80).replace(/\s+/g, ' ').trim() : '';
      if (snippet.startsWith('<!DOCTYPE') || snippet.startsWith('<html')) {
        message = 'Backend API is not reachable from the frontend (received HTML instead of JSON). Check VITE_API_BASE_URL / proxy configuration.';
      } else if (snippet) {
        message = `${message}. Response: ${snippet}`;
      }
    }

    const error = new Error(message);
    error.status = response.status;
    error.response = response;
    error.body = body;
    throw error;
  }

  return body;
}
