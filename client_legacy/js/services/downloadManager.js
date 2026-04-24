/**
 * Background Download Manager
 * Downloads scraped audio files via proxy and stores them in the local File System Access API
 */

import { fsService } from './fs.js';
import * as api from './api.js';
import { showToast } from '../utils/dom.js';

class DownloadManager {
  constructor() {
    this.activeDownloads = new Set();
  }

  /**
   * Start downloading a collection's tracks
   * @param {Object} collection - The collection object from the server
   */
  async startDownload(collection) {
    if (this.activeDownloads.has(collection.id)) return;
    this.activeDownloads.add(collection.id);

    try {
      let downloadedCount = 0;
      for (let i = 0; i < collection.tracks.length; i++) {
        const track = collection.tracks[i];
        
        // Skip if already downloaded
        if (track.downloaded) continue;

        // The filename we'll save it as
        const filename = `${collection.id}_${i}.mp3`;
        
        try {
          const streamUrl = api.getStreamUrl(track.audioUrl);
          const response = await fetch(streamUrl);
          
          if (!response.ok) throw new Error(`Failed to fetch ${track.title}`);
          
          const blob = await response.blob();
          await fsService.writeAudioFile(filename, blob);
          
          // Update metadata on server
          await api.markTrackDownloaded(track.id, filename);
          downloadedCount++;
          
        } catch (err) {
          console.error(`Error downloading track ${i}:`, err);
        }
      }
      
      if (downloadedCount > 0) {
        showToast(`Downloaded ${downloadedCount} tracks for ${collection.title}`, 'success');
      }
    } catch (err) {
      console.error('Download manager error:', err);
    } finally {
      this.activeDownloads.delete(collection.id);
    }
  }
}

export const downloadManager = new DownloadManager();
