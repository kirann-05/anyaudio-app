/**
 * AnyAudio — User Profile Page
 */

import { state } from '../app.js';
import * as api from '../services/api.js';
import { el } from '../utils/dom.js';
import { icons } from '../utils/icons.js';

export async function renderUserPage(container) {
  container.innerHTML = '';
  
  // Fetch some stats
  const collections = await api.getCollections(state.user.id);
  const playlists = await api.getPlaylists(state.user.id);
  
  const totalTracks = collections.reduce((acc, c) => acc + (c.tracks?.length || 0), 0);

  const page = el('div', { className: 'user-page', style: { padding: '40px 0' } });
  
  page.innerHTML = `
    <div class="user-header" style="display:flex; align-items:center; gap:32px; margin-bottom:48px;">
      <div class="user-large-avatar" style="width:120px; height:120px; border-radius:50%; background:var(--accent); color:#000; display:flex; align-items:center; justify-content:center; font-size:3rem; font-weight:800; box-shadow:var(--shadow-lg);">
        ${state.user.username.charAt(0).toUpperCase()}
      </div>
      <div>
        <h4 style="color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.1em; font-size:0.75rem; margin-bottom:8px;">Profile</h4>
        <h1 style="font-size:4rem; margin-bottom:16px;">${state.user.username}</h1>
        <div style="display:flex; gap:24px; color:var(--text-secondary); font-size:0.875rem; font-weight:600;">
          <span>${playlists.length} Public Playlists</span>
          <span>${collections.length} Collections</span>
          <span>${totalTracks} Tracks</span>
        </div>
      </div>
    </div>

    <div class="user-content">
      <h2 style="margin-bottom:24px;">Library Stats</h2>
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:24px;">
        <div class="glass-card" style="padding:24px;">
          <div style="color:var(--accent); margin-bottom:12px;">${icons.library}</div>
          <h3 style="margin-bottom:8px;">Storage Usage</h3>
          <p style="color:var(--text-secondary); font-size:0.875rem;">You have imported <strong>${collections.length}</strong> sources into your local database.</p>
        </div>
        <div class="glass-card" style="padding:24px;">
          <div style="color:var(--accent); margin-bottom:12px;">${icons.headphones}</div>
          <h3 style="margin-bottom:8px;">Listening Habits</h3>
          <p style="color:var(--text-secondary); font-size:0.875rem;">Average collection size: <strong>${Math.round(totalTracks / (collections.length || 1))}</strong> tracks.</p>
        </div>
      </div>
      
      <div style="margin-top:48px; padding:24px; border-top:1px solid var(--glass-border);">
        <button class="btn btn-ghost" id="btn-logout" style="color:var(--error);">
          Log Out
        </button>
      </div>
    </div>
  `;

  container.appendChild(page);

  page.querySelector('#btn-logout').addEventListener('click', () => {
    localStorage.removeItem('anyaudio_session');
    window.location.reload();
  });
}
