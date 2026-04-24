import { el } from '../utils/dom.js';
import { icons } from '../utils/icons.js';
import { navigate, state } from '../app.js';
import * as api from '../services/api.js';

export function renderSidebar() {
  const sidebar = el('div', { id: 'sidebar' });

  // Top Nav Card
  const navCard = el('div', { className: 'sidebar-card' });
  const navList = el('div', { className: 'sidebar-nav' });
  
  const homeBtn = el('div', { className: 'sidebar-nav-item active', id: 'nav-home', innerHTML: `${icons.home} Home` });
  const searchBtn = el('div', { className: 'sidebar-nav-item', id: 'nav-search', innerHTML: `${icons.search} Search` });
  
  homeBtn.addEventListener('click', () => navigate(''));
  searchBtn.addEventListener('click', () => {
    document.getElementById('global-url-input')?.focus();
    updateSidebarActiveNav('search');
  });

  navList.appendChild(homeBtn);
  navList.appendChild(searchBtn);
  navCard.appendChild(navList);
  sidebar.appendChild(navCard);

  // Library Card
  const libCard = el('div', { className: 'sidebar-card', style: { flex: 1 } });
  
  const libHeader = el('div', { className: 'sidebar-library-header', innerHTML: `<span style="display:flex;align-items:center;gap:8px;">${icons.library} Your Library</span> <span style="font-size:1.5rem;font-weight:400;line-height:1;">+</span>` });
  libHeader.addEventListener('click', () => navigate('library'));
  
  const libList = el('div', { className: 'sidebar-list', id: 'sidebar-library-list' });
  
  libCard.appendChild(libHeader);
  libCard.appendChild(libList);
  sidebar.appendChild(libCard);

  // Load Library Items
  refreshSidebarLibrary();

  return sidebar;
}

export async function refreshSidebarLibrary() {
  if (!state.user) return;
  const list = document.getElementById('sidebar-library-list');
  if (!list) return;

  try {
    const collections = await api.getCollections(state.user.id);
    const playlists = await api.getPlaylists(state.user.id);

    list.innerHTML = '';

    // Combine and sort by updated
    const items = [
      ...collections.map(c => ({ ...c, type: 'collection' })),
      ...playlists.map(p => ({ ...p, type: 'playlist' }))
    ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    items.forEach(item => {
      const isCol = item.type === 'collection';
      const count = isCol ? (item.tracks?.length || 0) : (item.trackCount || 0);
      const icon = isCol ? icons.music : icons.list;
      const title = isCol ? item.title : item.name;

      const elItem = el('div', { className: 'sidebar-item' });
      elItem.innerHTML = `
        <div class="sidebar-item-img">${icon}</div>
        <div class="sidebar-item-info">
          <div class="sidebar-item-title">${escapeHtml(title)}</div>
          <div class="sidebar-item-meta">${isCol ? 'Collection' : 'Playlist'} • ${count} tracks</div>
        </div>
      `;

      elItem.addEventListener('click', () => {
        if (isCol) navigate(`collection/${item.id}`);
        else navigate(`library`); // Playlists play view not fully implemented yet, redirect to library
      });

      list.appendChild(elItem);
    });

  } catch (err) {
    console.error('Failed to load sidebar library', err);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function updateSidebarActiveNav(path) {
  document.querySelectorAll('.sidebar-nav-item').forEach(el => el.classList.remove('active'));
  if (path === '' || path === 'home') {
    document.getElementById('nav-home')?.classList.add('active');
  } else if (path === 'search') {
    document.getElementById('nav-search')?.classList.add('active');
  }
}
