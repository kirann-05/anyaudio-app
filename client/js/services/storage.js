/**
 * Storage / Progress Sync Service
 * Handles syncing playback progress to the backend DB.
 */

import * as api from './api.js';
import { debounce } from '../utils/dom.js';

class StorageService {
  constructor() {
    // Sync progress to backend every 2s max
    this._saveProgressDebounced = debounce(this._saveProgressToAPI.bind(this), 2000);
  }

  // ===================== Session =====================
  getSession() {
    const raw = localStorage.getItem('anyaudio_session');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  setSession(user) {
    localStorage.setItem('anyaudio_session', JSON.stringify(user));
  }

  clearSession() {
    localStorage.removeItem('anyaudio_session');
  }

  // ===================== Progress =====================

  saveProgress(userId, collectionId, trackIndex, currentTime, completed = 0) {
    this._saveProgressLocal(collectionId, { trackIndex, currentTime, completed });
    this._saveProgressDebounced(userId, collectionId, trackIndex, currentTime, completed);
  }

  async saveProgressNow(userId, collectionId, trackIndex, currentTime, completed = 0) {
    this._saveProgressLocal(collectionId, { trackIndex, currentTime, completed });
    try {
      await api.saveProgress(userId, collectionId, trackIndex, currentTime, completed);
    } catch (err) {
      console.warn('Failed to save progress to API:', err);
    }
  }

  async _saveProgressToAPI(userId, collectionId, trackIndex, currentTime, completed) {
    try {
      await api.saveProgress(userId, collectionId, trackIndex, currentTime, completed);
    } catch (err) {
      console.warn('Failed to sync progress:', err);
    }
  }

  _saveProgressLocal(collectionId, data) {
    try {
      const key = `anyaudio_progress_${collectionId}`;
      localStorage.setItem(key, JSON.stringify({ ...data, updatedAt: Date.now() }));
    } catch {}
  }

  getProgressLocal(collectionId) {
    try {
      const raw = localStorage.getItem(`anyaudio_progress_${collectionId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async getBestProgress(userId, collectionId) {
    const local = this.getProgressLocal(collectionId);
    let dbProg = null;
    try {
      dbProg = await api.getProgress(userId, collectionId);
    } catch {}

    if (!local && !dbProg) return { trackIndex: 0, currentTime: 0, completed: 0 };
    if (!local) return dbProg;
    if (!dbProg) return local;

    const localTime = local.updatedAt || 0;
    const dbTime = new Date(dbProg.updatedAt).getTime() || 0;
    return localTime > dbTime ? local : dbProg;
  }
}

export const storage = new StorageService();
