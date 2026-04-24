/**
 * API Client — communicates with the AnyAudio backend
 */

const BASE = typeof window !== 'undefined' ? (localStorage.getItem('ANYAUDIO_BACKEND_URL') || '') : '';

async function fetchJSON(url: string, options: any = {}) {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ===================== User =====================
export async function deleteCollection(id: string) {
  const response = await fetch(`${BASE}/api/collection/${id}`, {
    method: 'DELETE',
  });
  return response.json();
}

export async function deletePlaylist(id: string) {
  const response = await fetch(`${BASE}/api/playlist/${id}`, {
    method: 'DELETE',
  });
  return response.json();
}

export async function login(username: string) {
  return fetchJSON('/api/user/login', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function getUser(userId: string) {
  return fetchJSON(`/api/user/${userId}`);
}

// ===================== Scrape =====================
export async function scrape(url: string, userId: string) {
  return fetchJSON('/api/scrape', {
    method: 'POST',
    body: JSON.stringify({ url, userId }),
  });
}

export async function search(q: string) {
  return fetchJSON(`/api/search?q=${encodeURIComponent(q)}`);
}

export async function getRecommendations(url: string) {
  return fetchJSON(`/api/recommendations?url=${encodeURIComponent(url)}`);
}

// ===================== Collections =====================
export async function getCollections(userId: string) {
  return fetchJSON(`/api/user/${userId}/collections`);
}

export async function getCollection(id: string) {
  return fetchJSON(`/api/collection/${id}`);
}

export async function deleteCollection(id: string) {
  return fetchJSON(`/api/collection/${id}`, { method: 'DELETE' });
}

export async function updateCollection(id: string, data: any) {
  return fetchJSON(`/api/collection/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ===================== Progress =====================
export async function saveProgress(userId: string, collectionId: string, trackIndex: number, currentTime: number, completed: boolean) {
  return fetchJSON('/api/progress', {
    method: 'POST',
    body: JSON.stringify({ userId, collectionId, trackIndex, currentTime, completed }),
  });
}

export async function getProgress(userId: string, collectionId: string) {
  return fetchJSON(`/api/progress/${userId}/${collectionId}`);
}

// ===================== Download Logging =====================
export async function markTrackDownloaded(trackId: string, localFilename: string) {
  return fetchJSON(`/api/track/${trackId}/downloaded`, {
    method: 'POST',
    body: JSON.stringify({ localFilename }),
  });
}

// ===================== Stream URL Builder =====================
export function getStreamUrl(audioUrl: string) {
  if (audioUrl.startsWith('/api/stream') || audioUrl.includes('/api/stream?url=')) {
    return audioUrl;
  }
  return `${BASE}/api/stream?url=${encodeURIComponent(audioUrl)}`;
}
