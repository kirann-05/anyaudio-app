/**
 * Collection Page — Renders the header and track list in the Main Viewport
 */

import { el, formatTime } from '../utils/dom.js';
import { icons } from '../utils/icons.js';
import { state } from '../app.js';
import * as api from '../services/api.js';
import { audioEngine } from '../services/audio.js';
import { storage } from '../services/storage.js';
import { fsService } from '../services/fs.js';
import { downloadManager } from '../services/downloadManager.js';

// We keep a reference to the active collection to avoid reloading if it's the same
let activeCollectionId = null;

export async function renderCollection(container, collectionId) {
  if (!collectionId) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon" style="display:inline-flex; width:64px; height:64px;">${icons.headphones}</div><h3>No collection selected</h3></div>`;
    return;
  }

  container.innerHTML = `<div class="flex-center" style="height:200px; flex-direction:column; gap:16px;"><div class="loading-spinner"></div><p class="text-secondary">Loading...</p></div>`;

  try {
    const collection = await api.getCollection(collectionId);
    if (!collection) { 
      container.innerHTML = '<div class="empty-state"><h3>Not found</h3></div>'; 
      return; 
    }
    
    const progress = await storage.getBestProgress(state.user.id, collectionId);
    
    container.innerHTML = '';
    buildUI(container, collection, progress);
    
    // Only load into audio engine if it's not already playing this collection
    if (audioEngine.collectionId !== collectionId) {
      audioEngine.loadCollection(collection.id, collection.title, collection.tracks, progress?.trackIndex || 0, progress?.currentTime || 0);
    }
    
    activeCollectionId = collectionId;

  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

function esc(t) { const d = document.createElement('div'); d.textContent = t||''; return d.innerHTML; }

function buildUI(container, col, progress) {
  // Collection Header
  const header = el('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '24px', paddingBottom: '24px', marginBottom: '24px', borderBottom: '1px solid var(--glass-border)' } });
  
  header.innerHTML = `
    <div style="width:192px; height:192px;">
      <div class="premium-cover" style="box-shadow: 0 12px 40px rgba(0,0,0,0.6);">
        ${col.cover_url 
          ? `<img src="${col.cover_url}" alt="${esc(col.title)}">` 
          : `<div class="premium-cover-fallback"><span>${col.title.charAt(0).toUpperCase()}</span></div>`
        }
      </div>
    </div>
    <div style="flex:1;">
      <div style="font-size:0.875rem; font-weight:700; text-transform:uppercase; margin-bottom:8px;">Collection</div>
      <h1 style="font-size:3.5rem; font-weight:900; line-height:1.1; margin-bottom:12px; letter-spacing:-0.04em;">${esc(col.title)}</h1>
      <div style="display:flex; align-items:center; gap:8px; font-size:0.875rem; color:var(--text-secondary);">
        <span style="font-weight:700; color:var(--text-primary);">${state.user.username}</span>
        <span>•</span>
        <span>${col.tracks.length} tracks</span>
      </div>
    </div>
  `;
  container.appendChild(header);

  // Play button row
  const actionRow = el('div', { style: { paddingBottom: '24px', display: 'flex', alignItems: 'center', gap: '24px' } });
  const playBtn = el('button', { className: 'btn-play', style: { width: '56px', height: '56px', background: 'var(--accent)', color: '#000' } });
  
  // Update play button state based on audio engine
  const updatePlayBtn = () => {
    if (audioEngine.collectionId === col.id && audioEngine.isPlaying) {
      playBtn.innerHTML = icons.pause;
    } else {
      playBtn.innerHTML = icons.play;
    }
    // Size override for SVG inside this specific button
    const svg = playBtn.querySelector('svg');
    if(svg) { svg.style.width = '24px'; svg.style.height = '24px'; svg.style.marginLeft = playBtn.innerHTML.includes('polygon') ? '4px' : '0'; }
  };
  updatePlayBtn();
  
  playBtn.addEventListener('click', () => {
    if (audioEngine.collectionId !== col.id) {
      // It's a new collection, start from beginning or saved progress
      audioEngine.loadCollection(col.id, col.title, col.tracks, progress?.trackIndex || 0, progress?.currentTime || 0);
      audioEngine.play();
    } else {
      audioEngine.togglePlay();
    }
  });

  actionRow.appendChild(playBtn);

  // Download button
  const downloadBtn = el('button', { 
    className: 'btn btn-ghost', 
    style: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' },
    title: 'Download for offline use'
  });
  downloadBtn.innerHTML = `${icons.download} <span>Download</span>`;
  
  downloadBtn.addEventListener('click', async () => {
    if (!fsService.isReady) {
      showToast('Please connect a library folder first', 'info');
      await fsService.promptForDirectory();
    }
    if (fsService.isReady) {
      showToast('Starting download...', 'info');
      downloadManager.startDownload(col);
    }
  });
  
  actionRow.appendChild(downloadBtn);
  container.appendChild(actionRow);

  // Track List Header
  const listHeader = el('div', { style: { display: 'grid', gridTemplateColumns: '40px 1fr 60px', gap: '16px', padding: '0 16px 8px', color: 'var(--text-muted)', fontSize: '0.875rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px' } });
  listHeader.innerHTML = `
    <div style="text-align:right;">#</div>
    <div>Title</div>
    <div></div>
  `;
  container.appendChild(listHeader);

  // Track List
  const trackList = el('div', { className: 'track-list', id: 'collection-track-list' });
  col.tracks.forEach((t, i) => {
    const isPlayingThis = audioEngine.collectionId === col.id && audioEngine.currentIndex === i;
    
    // Check progress
    const done = progress && progress.trackIndex > i;
    const cur = progress && progress.trackIndex === i;
    
    const item = el('div', { 
      className: `sidebar-item ${isPlayingThis ? 'active' : ''}`, 
      style: { padding: '12px 16px', borderRadius: '4px', display: 'grid', gridTemplateColumns: '40px 1fr 60px', gap: '16px', alignItems: 'center' }
    });
    
    const isDownloaded = t.downloaded === 1 || t.downloaded === true;
    
    item.innerHTML = `
      <div style="text-align:right;color:var(--text-muted);font-variant-numeric:tabular-nums;">${isPlayingThis ? `<span style="color:var(--accent);">${icons.music}</span>` : i+1}</div>
      <div style="color:${isPlayingThis ? 'var(--accent)' : 'var(--text-primary)'}; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:8px;">
        ${esc(t.title)}
        ${isDownloaded ? `<span style="color:var(--success); width:12px; height:12px;" title="Downloaded">${icons.circleCheck}</span>` : ''}
      </div>
      <div></div>
    `;
    
    item.addEventListener('click', () => {
      if (audioEngine.collectionId !== col.id) {
        audioEngine.loadCollection(col.id, col.title, col.tracks, i, 0);
      } else {
        audioEngine.loadTrack(i);
      }
    });
    
    trackList.appendChild(item);
  });
  
  container.appendChild(trackList);

  // Global Audio Engine Listeners specific to this view
  const trackChangeHandler = (e) => {
    updatePlayBtn();
    if (e.detail.collectionId === col.id) {
      // Re-render UI to update active states
      // A full re-render is fine for this simple SPA
      const currentProgress = storage.getProgressLocal(col.id);
      container.innerHTML = '';
      buildUI(container, col, currentProgress);
    }
  };

  const stateChangeHandler = () => {
    updatePlayBtn();
  };

  audioEngine.addEventListener('trackchange', trackChangeHandler);
  audioEngine.addEventListener('statechange', stateChangeHandler);

  // Cleanup listeners when navigating away (hacky but works for this SPA)
  const cleanup = () => {
    audioEngine.removeEventListener('trackchange', trackChangeHandler);
    audioEngine.removeEventListener('statechange', stateChangeHandler);
    window.removeEventListener('hashchange', cleanup);
  };
  window.addEventListener('hashchange', cleanup);
}
