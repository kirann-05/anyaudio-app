/**
 * Library Page — Collections & Playlists with tabs
 */
import { el, showToast, timeAgo, createProgressRing } from '../utils/dom.js';
import { state, navigate } from '../app.js';
import * as api from '../services/api.js';
import { icons } from '../utils/icons.js';

export async function renderLibrary(container) {
  const page = el('div', { className: 'container', style: { paddingTop: '32px', paddingBottom: '60px' } });

  // Header
  const header = el('div', { style: { marginBottom: '24px' } });
  header.innerHTML = `<h1 style="font-size:1.75rem; display: flex; align-items: center; gap: 8px;">${icons.library} Your Library</h1><p class="text-secondary" style="margin-top:4px;">All your scraped collections and custom playlists</p>`;
  page.appendChild(header);

  // Tabs
  const tabs = el('div', { className: 'tabs', style: { maxWidth: '320px', marginBottom: '24px' } });
  const tabCollections = el('button', { className: 'tab active', id: 'tab-collections', innerHTML: `<span style="display:flex;align-items:center;justify-content:center;gap:14px;"><span style="width:16px;height:16px;">${icons.music}</span> Collections</span>` });
  const tabPlaylists = el('button', { className: 'tab', id: 'tab-playlists', innerHTML: `<span style="display:flex;align-items:center;justify-content:center;gap:14px;"><span style="width:16px;height:16px;">${icons.list}</span> Playlists</span>` });
  tabs.appendChild(tabCollections);
  tabs.appendChild(tabPlaylists);
  page.appendChild(tabs);

  // Content areas
  const collectionsView = el('div', { id: 'collections-view' });
  const playlistsView = el('div', { id: 'playlists-view', style: { display: 'none' } });
  page.appendChild(collectionsView);
  page.appendChild(playlistsView);

  container.appendChild(page);

  // Tab switching
  tabCollections.addEventListener('click', () => {
    tabCollections.classList.add('active'); tabPlaylists.classList.remove('active');
    collectionsView.style.display = ''; playlistsView.style.display = 'none';
  });
  tabPlaylists.addEventListener('click', () => {
    tabPlaylists.classList.add('active'); tabCollections.classList.remove('active');
    playlistsView.style.display = ''; collectionsView.style.display = 'none';
  });

  // Load data
  await Promise.all([loadCollections(collectionsView), loadPlaylists(playlistsView)]);
}

function esc(t) { const d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; }

async function loadCollections(container) {
  try {
    const collections = await api.getCollections(state.user.id);
    container.innerHTML = '';

    if (collections.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon" style="display:inline-flex; width:64px; height:64px;">${icons.music}</div><h3>No collections yet</h3><p>Go to the home page and paste a URL to get started</p></div>`;
      return;
    }

    const grid = el('div', { className: 'collections-grid' });
    collections.forEach(col => {
      const count = col.tracks?.length || 0;
      const pct = count > 0 ? Math.round((col.trackIndex / count) * 100) : 0;

      const card = el('div', { className: 'card', style: { position: 'relative' } });
      card.innerHTML = `
        <div class="card-image-wrap">
          ${icons.music}
          <div class="card-play-btn resume-btn">${icons.play}</div>
        </div>
        <div class="card-title">${esc(col.title)}</div>
        <div class="card-subtitle" style="margin-bottom:12px;">Collection • ${count} tracks</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
          <div style="flex:1;height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:2px;"></div>
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary btn-sm playlist-btn" style="flex:1;">+ Playlist</button>
          <button class="btn btn-ghost btn-sm del-btn" style="color:var(--text-muted);padding:0 12px;">${icons.trash}</button>
        </div>`;

      card.querySelector('.resume-btn').addEventListener('click', e => { e.stopPropagation(); navigate(`player/${col.id}`); });
      card.querySelector('.del-btn').addEventListener('click', async e => {
        e.stopPropagation();
        if (confirm('Delete this collection?')) {
          await api.deleteCollection(col.id); card.remove(); showToast('Deleted', 'success');
        }
      });
      card.querySelector('.playlist-btn').addEventListener('click', e => {
        e.stopPropagation(); showAddToPlaylistModal(col);
      });
      card.addEventListener('click', () => navigate(`player/${col.id}`));
      grid.appendChild(card);
    });
    container.appendChild(grid);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>Error loading</h3><p>${err.message}</p></div>`;
  }
}

async function loadPlaylists(container) {
  try {
    const playlists = await api.getPlaylists(state.user.id);
    container.innerHTML = '';

    // Create button
    const createBtn = el('button', { className: 'btn btn-primary', id: 'create-playlist-btn', style: { marginBottom: '20px' } });
    createBtn.textContent = '+ Create New Playlist';
    createBtn.addEventListener('click', showCreatePlaylistModal);
    container.appendChild(createBtn);

    if (playlists.length === 0) {
      const empty = el('div', { className: 'empty-state' });
      empty.innerHTML = `<div class="empty-icon" style="display:inline-flex; width:64px; height:64px;">${icons.list}</div><h3>No playlists yet</h3><p>Create a playlist and add tracks from your collections</p>`;
      container.appendChild(empty);
      return;
    }

    const grid = el('div', { className: 'collections-grid' });
    playlists.forEach(pl => {
      const card = el('div', { className: 'card', style: { position: 'relative' } });
      card.innerHTML = `
        <div class="card-image-wrap">
          ${icons.list}
          <div class="card-play-btn play-btn">${icons.play}</div>
        </div>
        <div class="card-title">${esc(pl.name)}</div>
        <div class="card-subtitle" style="margin-bottom:12px;">Playlist • ${pl.trackCount || 0} tracks</div>
        <div style="display:flex; justify-content:flex-end;">
          <button class="btn btn-ghost btn-sm del-btn" style="color:var(--text-muted);padding:0 12px;">${icons.trash}</button>
        </div>`;

      card.querySelector('.play-btn').addEventListener('click', e => { e.stopPropagation(); showToast('Playlist playback coming soon!', 'info'); });
      card.querySelector('.del-btn').addEventListener('click', async e => {
        e.stopPropagation();
        if (confirm('Delete this playlist?')) {
          await api.deletePlaylist(pl.id); card.remove(); showToast('Deleted', 'success');
        }
      });
      grid.appendChild(card);
    });
    container.appendChild(grid);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

function showCreatePlaylistModal() {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'modal' });
  modal.innerHTML = `
    <h2>Create Playlist</h2><p>Give your playlist a name</p>
    <input type="text" class="input" id="playlist-name-input" placeholder="My Playlist" autofocus/>
    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="btn btn-primary" id="create-pl-confirm" style="flex:1;">Create</button>
      <button class="btn btn-secondary" id="create-pl-cancel" style="flex:1;">Cancel</button>
    </div>`;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('create-pl-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('create-pl-confirm').addEventListener('click', async () => {
    const name = document.getElementById('playlist-name-input').value.trim();
    if (!name) return;
    try {
      await api.createPlaylist(state.user.id, name);
      overlay.remove();
      showToast('Playlist created!', 'success');
      const pv = document.getElementById('playlists-view');
      if (pv) loadPlaylists(pv);
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function showAddToPlaylistModal(collection) {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  let playlists = [];
  try { playlists = await api.getPlaylists(state.user.id); } catch (err) { console.error(err); }

  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'modal' });

  let listHtml = '';
  if (playlists.length === 0) {
    listHtml = '<p class="text-muted" style="text-align:center;padding:16px;">No playlists yet. Create one first.</p>';
  } else {
    listHtml = playlists.map(pl => `
      <div class="track-item" data-plid="${pl.id}" style="cursor:pointer;padding:12px;border-radius:8px;">
        <span style="display:inline-flex; width:20px; height:20px;">${icons.list}</span><div class="track-info"><div class="track-title">${esc(pl.name)}</div><div class="track-duration">${pl.trackCount} tracks</div></div>
      </div>`).join('');
  }

  modal.innerHTML = `
    <h2>Add to Playlist</h2><p>Add all ${collection.tracks?.length || 0} tracks from "${esc(collection.title)}" to:</p>
    <div style="max-height:300px;overflow-y:auto;margin:12px 0;">${listHtml}</div>
    <button class="btn btn-secondary w-full" id="add-pl-cancel" style="width:100%;margin-top:8px;">Cancel</button>`;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('add-pl-cancel').addEventListener('click', () => overlay.remove());

  modal.querySelectorAll('[data-plid]').forEach(item => {
    item.addEventListener('click', async () => {
      const plId = item.getAttribute('data-plid');
      const indices = collection.tracks.map((_, i) => i);
      try {
        await api.addToPlaylist(plId, collection.id, indices);
        overlay.remove();
        showToast('Added to playlist!', 'success');
      } catch (err) { showToast(err.message, 'error'); }
    });
  });
}
