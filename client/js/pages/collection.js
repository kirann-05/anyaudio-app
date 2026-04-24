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
          ? `<img src="${col.cover_url}" alt="${esc(col.title)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` 
          : ''
        }
        <div class="premium-cover-fallback" style="${col.cover_url ? 'display:none;' : ''}"><span>${col.title.charAt(0).toUpperCase()}</span></div>
      </div>
    </div>
    <div style="flex:1;">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
        <div class="badge ${col.type === 'podcast' ? 'badge-success' : ''}" style="text-transform:uppercase;">${col.type || 'music'}</div>
        <div style="font-size:0.875rem; font-weight:700; text-transform:uppercase; color:var(--text-muted);">Collection</div>
      </div>
      <div style="display:flex; align-items:center; gap:16px;">
        <h1 id="collection-title" style="font-size:3.5rem; font-weight:900; line-height:1.1; letter-spacing:-0.04em;">${esc(col.title)}</h1>
        <button id="btn-rename" class="btn btn-ghost btn-icon" title="Rename">${icons.edit || '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>'}</button>
      </div>
      <div style="display:flex; align-items:center; gap:8px; font-size:0.875rem; color:var(--text-secondary);">
        <span style="font-weight:700; color:var(--text-primary);">${state.user.username}</span>
        <span>•</span>
        <span>${col.tracks.length} tracks</span>
      </div>
    </div>
  `;
  container.appendChild(header);

  // Rename Logic
  header.querySelector('#btn-rename').addEventListener('click', async () => {
    const newTitle = prompt('Rename collection:', col.title);
    if (newTitle && newTitle !== col.title) {
      try {
        await api.updateCollection(col.id, { title: newTitle });
        col.title = newTitle;
        document.getElementById('collection-title').textContent = newTitle;
        document.title = `${newTitle} — AnyAudio`;
        // Refresh sidebar
        const { refreshSidebarLibrary } = await import('../components/sidebar.js');
        refreshSidebarLibrary();
      } catch (err) {
        alert('Failed to rename: ' + err.message);
      }
    }
  });

  // Play button row (Spotify Principle: Primary Action Dominance)
  const actionRow = el('div', { 
    className: 'collection-action-bar',
    style: { paddingBottom: '32px', display: 'flex', alignItems: 'center', gap: '32px' } 
  });
  
  const playBtn = el('button', { 
    className: 'btn-play-hero', 
    style: { width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', transition: 'transform 0.2s' } 
  });
  
  const shuffleBtn = el('button', { className: 'btn-icon-subtle', title: 'Shuffle', innerHTML: icons.shuffle });
  const addPlaylistBtn = el('button', { className: 'btn-icon-subtle', title: 'Add to Playlist', innerHTML: icons.list });
  const downloadBtn = el('button', { className: 'btn-icon-subtle', title: 'Download all', innerHTML: icons.download });
  const moreBtn = el('button', { className: 'btn-icon-subtle', title: 'More', innerHTML: icons.more });

  actionRow.appendChild(playBtn);
  actionRow.appendChild(shuffleBtn);
  actionRow.appendChild(addPlaylistBtn);
  actionRow.appendChild(downloadBtn);
  actionRow.appendChild(moreBtn);
  
  // Right-aligned List View Toggle
  const listToggle = el('div', { 
    style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600' } 
  });
  listToggle.innerHTML = `<span>List</span> ${icons.list}`;
  actionRow.appendChild(listToggle);

  container.appendChild(actionRow);

  // Logic for Play Button
  const updatePlayBtn = () => {
    if (audioEngine.collectionId === col.id && audioEngine.isPlaying) {
      playBtn.innerHTML = icons.pause;
    } else {
      playBtn.innerHTML = icons.play;
    }
    const svg = playBtn.querySelector('svg');
    if(svg) { svg.style.width = '28px'; svg.style.height = '28px'; }
  };
  audioEngine.on('stateChange', updatePlayBtn);
  updatePlayBtn();

  playBtn.addEventListener('click', () => {
    if (audioEngine.collectionId !== col.id) {
      audioEngine.loadCollection(col.id, col.title, col.tracks, progress?.trackIndex || 0, progress?.currentTime || 0);
      audioEngine.play();
    } else {
      audioEngine.togglePlay();
    }
  });

  addPlaylistBtn.addEventListener('click', async () => {
    try {
      const playlists = await api.getPlaylists(state.user.id);
      let selectedPlaylist = null;
      if (playlists.length === 0) {
        const name = prompt('Enter a name for your new playlist:');
        if (name) selectedPlaylist = await api.createPlaylist(state.user.id, name);
        else return;
      } else {
        const pList = playlists.map((p, i) => `${i+1}. ${p.name}`).join('\n');
        const choice = prompt(`Add to which playlist? (Enter number):\n${pList}`);
        if (!choice) return;
        selectedPlaylist = playlists[parseInt(choice) - 1];
      }
      if (selectedPlaylist) {
        const trackIndices = col.tracks.map(t => t.track_index);
        await api.addToPlaylist(selectedPlaylist.id, col.id, trackIndices);
        alert(`Added ${trackIndices.length} tracks to "${selectedPlaylist.name}"`);
        const { refreshSidebarLibrary } = await import('../components/sidebar.js');
        refreshSidebarLibrary();
      }
    } catch (err) { alert('Failed: ' + err.message); }
  });

  downloadBtn.addEventListener('click', async () => {
    if (!fsService.isReady) { await fsService.promptForDirectory(); }
    if (fsService.isReady) { downloadManager.startDownload(col); }
  });

  // Track List Header
  const listHeader = el('div', { className: 'track-list-row header', style: { display: 'grid', gridTemplateColumns: '40px 1fr 60px', gap: '16px', padding: '0 16px 8px', color: 'var(--text-muted)', fontSize: '0.875rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px' } });
  listHeader.innerHTML = `
    <div style="text-align:right;">#</div>
    <div>Title</div>
    <div style="text-align:right;">${icons.clock || ''}</div>
  `;
  container.appendChild(listHeader);

  // Render Tracks
  col.tracks.forEach((track, idx) => {
    const isPlaying = audioEngine.collectionId === col.id && audioEngine.currentTrackIndex === idx;
    
    const row = el('div', { 
      className: `track-list-row ${isPlaying ? 'active' : ''}`, 
      style: { display: 'grid', gridTemplateColumns: '40px 1fr 60px', gap: '16px', padding: '12px 16px', borderRadius: '4px', cursor: 'pointer', alignItems: 'center' } 
    });

    row.innerHTML = `
      <div class="track-number-cell" style="text-align:right; position:relative; width:40px; height:20px;">
        <span class="num">${idx + 1}</span>
        <span class="play-icon" style="display:none; position:absolute; top:0; right:0;">${icons.play}</span>
      </div>
      <div class="track-info">
        <div class="track-title" style="font-weight: 500; color: ${isPlaying ? 'var(--accent)' : 'var(--text-primary)'}">${track.title}</div>
      </div>
      <div class="track-duration" style="text-align:right; color:var(--text-muted); font-size:0.875rem;">
        ${track.duration || '--:--'}
      </div>
    `;

    row.addEventListener('click', () => {
      audioEngine.loadCollection(col.id, col.title, col.tracks, idx);
      audioEngine.play();
    });

    container.appendChild(row);
  });

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
