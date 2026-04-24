/**
 * Audio Playback Engine
 * Wraps HTML5 <audio> element with events, auto-advance, and controls
 */

import { getStreamUrl } from './api.js';
import { fsService } from './fs.js';

class AudioEngine extends EventTarget {
  constructor() {
    super();
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';

    this.tracks = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.collectionId = null;
    this.collectionTitle = '';

    this._bindEvents();
  }

  _bindEvents() {
    this.audio.addEventListener('timeupdate', () => {
      this.emit('timeupdate', {
        currentTime: this.audio.currentTime,
        duration: this.audio.duration,
        progress: this.audio.duration ? (this.audio.currentTime / this.audio.duration) * 100 : 0,
      });
    });

    this.audio.addEventListener('ended', () => {
      this.emit('trackended', { index: this.currentIndex });
      this.next();
    });

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.emit('statechange', { isPlaying: true });
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.emit('statechange', { isPlaying: false });
    });

    this.audio.addEventListener('loadstart', () => {
      this.emit('loading', { loading: true });
    });

    this.audio.addEventListener('canplay', () => {
      this.emit('loading', { loading: false });
    });

    this.audio.addEventListener('error', (e) => {
      console.error('Audio error:', this.audio.error?.message || 'unknown');
      this.emit('error', { error: this.audio.error });
      // Auto-skip to next track after a failed load
      setTimeout(() => {
        if (this.currentIndex < this.tracks.length - 1) {
          console.warn(`  ⏭ Skipping unplayable track ${this.currentIndex + 1}`);
          this.next();
        }
      }, 1500);
    });

    this.audio.addEventListener('progress', () => {
      if (this.audio.buffered.length > 0) {
        const buffered = this.audio.buffered.end(this.audio.buffered.length - 1);
        this.emit('buffered', {
          buffered,
          progress: this.audio.duration ? (buffered / this.audio.duration) * 100 : 0,
        });
      }
    });

    this.audio.addEventListener('durationchange', () => {
      this.emit('durationchange', { duration: this.audio.duration });
    });
  }

  emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  on(type, callback) {
    const wrapper = (e) => callback(e.detail);
    callback._wrapper = wrapper; // Store for off()
    this.addEventListener(type, wrapper);
  }

  off(type, callback) {
    this.removeEventListener(type, callback._wrapper || callback);
  }

  /**
   * Load a collection of tracks
   */
  loadCollection(collectionId, collectionTitle, tracks, startIndex = 0, startTime = 0) {
    this.collectionId = collectionId;
    this.collectionTitle = collectionTitle;
    this.tracks = tracks;
    this.currentIndex = startIndex;
    this.loadTrack(startIndex, startTime, false);
    this.emit('collectionloaded', { collectionId, tracks, currentIndex: startIndex });
  }

  /**
   * Load a specific track by index
   */
  async loadTrack(index, startTime = 0, autoPlay = true) {
    if (index < 0 || index >= this.tracks.length) return;

    this.currentIndex = index;
    const track = this.tracks[index];

    if (track.audioUrl || track.audio_url) {
      const audioUrl = track.audioUrl || track.audio_url;
      if (track.downloaded && track.localFilename && fsService.isReady) {
        // Play local file
        const blobUrl = await fsService.getAudioFileUrl(track.localFilename);
        if (blobUrl) {
          this.audio.src = blobUrl;
        } else {
          // Fallback to stream if local file missing
          this.audio.src = getStreamUrl(audioUrl);
        }
      } else {
        // Stream online
        this.audio.src = getStreamUrl(audioUrl);
      }
      
      if (startTime > 0) {
        this.audio.currentTime = startTime;
      }
      if (autoPlay) {
        this.audio.play().catch(err => console.warn('Autoplay blocked:', err));
      }
    }

    this.emit('trackchange', {
      index,
      track,
      collectionId: this.collectionId,
      collectionTitle: this.collectionTitle,
    });
  }

  play() {
    if (this.audio.src) {
      this.audio.play().catch(err => console.warn('Play failed:', err));
    }
  }

  pause() {
    this.audio.pause();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  next() {
    if (this.currentIndex < this.tracks.length - 1) {
      this.loadTrack(this.currentIndex + 1);
    } else {
      // End of playlist
      this.pause();
      this.emit('playlistended');
    }
  }

  previous() {
    // If more than 3 seconds in, restart current track
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
    } else if (this.currentIndex > 0) {
      this.loadTrack(this.currentIndex - 1);
    }
  }

  seek(time) {
    if (this.audio.duration) {
      this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration));
    }
  }

  seekPercent(percent) {
    if (this.audio.duration) {
      this.seek((percent / 100) * this.audio.duration);
    }
  }

  skipForward(seconds = 15) {
    this.seek(this.audio.currentTime + seconds);
  }

  skipBackward(seconds = 15) {
    this.seek(this.audio.currentTime - seconds);
  }

  setVolume(vol) {
    this.audio.volume = Math.max(0, Math.min(1, vol));
    this.emit('volumechange', { volume: this.audio.volume });
  }

  setSpeed(rate) {
    this.audio.playbackRate = rate;
    this.emit('speedchange', { speed: rate });
  }

  get currentTrack() {
    return this.tracks[this.currentIndex] || null;
  }

  get currentTime() {
    return this.audio.currentTime;
  }

  get duration() {
    return this.audio.duration;
  }

  get volume() {
    return this.audio.volume;
  }

  get speed() {
    return this.audio.playbackRate;
  }

  destroy() {
    this.audio.pause();
    this.audio.src = '';
  }
}

// Singleton
export const audioEngine = new AudioEngine();
