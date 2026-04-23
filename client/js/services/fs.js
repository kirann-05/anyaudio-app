/**
 * File System Storage Service
 * Uses the File System Access API to read/write JSON and Audio blobs to a local directory.
 */

// We use IndexedDB just to store the directory handle so we don't have to prompt the user to select the folder every time (though they still need to grant permission on reload)
import { get, set } from 'https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm';

class FileSystemService {
  constructor() {
    this.dirHandle = null;
    this.isReady = false;
  }

  /**
   * Check if we already have a directory handle stored.
   */
  async init() {
    try {
      const handle = await get('anyaudio_dir_handle');
      if (handle) {
        // Verify permission
        if (await this._verifyPermission(handle, false)) {
          this.dirHandle = handle;
          this.isReady = true;
          return true;
        }
      }
    } catch (e) {
      console.warn('Failed to init File System:', e);
    }
    return false;
  }

  /**
   * Prompt user to select a directory
   */
  async promptForDirectory() {
    try {
      this.dirHandle = await window.showDirectoryPicker({
        id: 'anyaudio_library',
        mode: 'readwrite',
        startIn: 'music',
      });
      await set('anyaudio_dir_handle', this.dirHandle);
      this.isReady = true;
      return true;
    } catch (e) {
      console.error('Directory selection failed:', e);
      return false;
    }
  }

  /**
   * Verify we have permission to read/write the handle
   */
  async _verifyPermission(fileHandle, withUserGesture = false) {
    const options = { mode: 'readwrite' };
    if ((await fileHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    if (withUserGesture) {
      if ((await fileHandle.requestPermission(options)) === 'granted') {
        return true;
      }
    }
    return false;
  }

  /**
   * Get permission if needed (requires user gesture)
   */
  async requestPermission() {
    if (!this.dirHandle) return false;
    return await this._verifyPermission(this.dirHandle, true);
  }

  /**
   * Read a JSON file
   */
  async readJSON(filename) {
    if (!this.dirHandle) throw new Error('No directory selected');
    try {
      const fileHandle = await this.dirHandle.getFileHandle(filename, { create: false });
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch (e) {
      if (e.name === 'NotFoundError') {
        return null;
      }
      throw e;
    }
  }

  /**
   * Write a JSON file
   */
  async writeJSON(filename, data) {
    if (!this.dirHandle) throw new Error('No directory selected');
    const fileHandle = await this.dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  }

  /**
   * Get the 'audio' subdirectory handle
   */
  async _getAudioDir() {
    if (!this.dirHandle) throw new Error('No directory selected');
    return await this.dirHandle.getDirectoryHandle('audio', { create: true });
  }

  /**
   * Write an audio blob to a file
   */
  async writeAudioFile(filename, blob) {
    const audioDir = await this._getAudioDir();
    const fileHandle = await audioDir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  /**
   * Get a blob URL for a local audio file
   */
  async getAudioFileUrl(filename) {
    try {
      const audioDir = await this._getAudioDir();
      const fileHandle = await audioDir.getFileHandle(filename, { create: false });
      const file = await fileHandle.getFile();
      return URL.createObjectURL(file);
    } catch (e) {
      if (e.name === 'NotFoundError') return null;
      throw e;
    }
  }

  /**
   * Delete an audio file
   */
  async deleteAudioFile(filename) {
    try {
      const audioDir = await this._getAudioDir();
      await audioDir.removeEntry(filename);
    } catch (e) {
      if (e.name !== 'NotFoundError') throw e;
    }
  }
}

export const fsService = new FileSystemService();
