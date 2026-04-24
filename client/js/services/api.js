/**
 * API Client — communicates with the AnyAudio backend
 */

// Set this to your backend URL (e.g. https://anyaudio-backend.onrender.com)
// If empty, it assumes the backend is on the same domain as the frontend
const BASE = localStorage.getItem('ANYAUDIO_BACKEND_URL') || ''; 


async function fetchJSON(url, options = {}) {
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
export async function login(username) {
  return fetchJSON('/api/user/login', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function getUser(userId) {
  return fetchJSON(`/api/user/${userId}`);
}

// ===================== Scrape =====================
export async function scrapeUrl(url, userId) {
  return fetchJSON('/api/scrape', {
    method: 'POST',
    body: JSON.stringify({ url, userId }),
  });
}

// ===================== Collections =====================
export async function getCollections(userId) {
  return fetchJSON(`/api/user/${userId}/collections`);
}

export async function getCollection(id) {
  return fetchJSON(`/api/collection/${id}`);
}

export async function deleteCollection(id) {
  return fetchJSON(`/api/collection/${id}`, { method: 'DELETE' });
}

export async function updateCollection(id, data) {
  return fetchJSON(`/api/collection/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ===================== Progress =====================
export async function saveProgress(userId, collectionId, trackIndex, currentTime, completed) {
  return fetchJSON('/api/progress', {
    method: 'POST',
    body: JSON.stringify({ userId, collectionId, trackIndex, currentTime, completed }),
  });
}

export async function getProgress(userId, collectionId) {
  return fetchJSON(`/api/progress/${userId}/${collectionId}`);
}

// ===================== Download Logging =====================
export async function markTrackDownloaded(trackId, localFilename) {
  return fetchJSON(`/api/track/${trackId}/downloaded`, {
    method: 'POST',
    body: JSON.stringify({ localFilename }),
  });
}

// ===================== Playlists =====================
export async function createPlaylist(userId, name, description = '') {
  return fetchJSON('/api/playlist', {
    method: 'POST',
    body: JSON.stringify({ userId, name, description }),
  });
}

export async function getPlaylists(userId) {
  return fetchJSON(`/api/user/${userId}/playlists`);
}

export async function getPlaylist(id) {
  return fetchJSON(`/api/playlist/${id}`);
}

export async function addToPlaylist(playlistId, collectionId, trackIndices) {
  return fetchJSON(`/api/playlist/${playlistId}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ collectionId, trackIndices }),
  });
}

export async function deletePlaylist(id) {
  return fetchJSON(`/api/playlist/${id}`, { method: 'DELETE' });
}

// ===================== Stream URL Builder =====================
export function getStreamUrl(audioUrl) {
  return `${BASE}/api/stream?url=${encodeURIComponent(audioUrl)}`;
}
