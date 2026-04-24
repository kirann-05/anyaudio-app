/**
 * AnyAudio — Main Application Controller & SPA Router (Spotify Architecture)
 */

import { storage } from './services/storage.js';
import { fsService } from './services/fs.js';
import * as api from './services/api.js';
import { el } from './utils/dom.js';
import { icons } from './utils/icons.js';
import { renderSidebar, updateSidebarActiveNav } from './components/sidebar.js';
import { renderPlayerBar } from './components/playerBar.js';
import { renderRightPanel } from './components/rightPanel.js';

import { renderLanding } from './pages/landing.js';
import { renderCollection } from './pages/collection.js';
import { renderLibrary } from './pages/library.js';
import { renderSearch } from './pages/search.js';

// ===================== App State =====================
export const state = {
  user: null,
  currentPage: null,
};

// ===================== Router =====================
function getRoute() {
  const hash = window.location.hash || '#/';
  const parts = hash.slice(2).split('/');
  return { path: parts[0] || '', param: parts[1] || null };
}

export function navigate(path) {
  window.location.hash = '#/' + path;
}

// ===================== App Shell Setup =====================
let isAppInitialized = false;

async function handleRoute() {
  const route = getRoute();
  const root = document.getElementById('app');

  // Check auth — validate stored session against backend
  if (!state.user) {
    const session = storage.getSession();
    if (session && session.id) {
      try {
        await api.getUser(session.id); // validate session
        state.user = session;
      } catch {
        // Session is stale or user doesn't exist
        storage.clearSession();
        renderLoginModal(root);
        return;
      }
    } else {
      renderLoginModal(root);
      return;
    }
  }

  // Initialize App Shell (once)
  if (!isAppInitialized) {
    root.innerHTML = '';
    
    const appGrid = el('div', { id: 'app-grid' });
    
    // Sidebar
    const sidebar = renderSidebar();
    appGrid.appendChild(sidebar);
    
    // Main Viewport
    const mainViewport = el('div', { id: 'main-viewport' });
    
    // Header inside main viewport
    const header = el('div', { className: 'main-header' });
    header.innerHTML = `
      <div class="header-search" style="display:flex;align-items:center;gap:16px;flex:1;flex-wrap:wrap;">
        <div style="position:relative; flex:1; min-width:200px;">
          <div style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-secondary); pointer-events:none;">${icons.search}</div>
          <input type="text" class="input" id="global-url-input" placeholder="Paste link or search..." autocomplete="off" style="padding-left:40px; width:100%; border-radius:var(--radius-full);" />
          <button id="header-search-trigger" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:var(--accent); border:none; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#000;">
            ${icons.search}
          </button>
        </div>
        
        <div class="mode-toggle-wrapper" style="display:flex; align-items:center; gap:10px; background:var(--bg-elevated); padding:6px 14px; border-radius:var(--radius-full); border:1px solid var(--glass-border);">
          <span style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">OFFLINE MODE</span>
          <label class="switch">
            <input type="checkbox" id="offline-mode-toggle">
            <span class="slider round"></span>
          </label>
        </div>
      </div>

      <div class="header-user" style="display:flex; align-items:center; gap:12px; margin-left:16px;">
        <div class="user-avatar" id="user-profile-trigger" style="cursor:pointer; width:40px; height:40px; font-size:1rem;">${state.user.username.charAt(0).toUpperCase()}</div>
      </div>
    `;
    mainViewport.appendChild(header);

    const contentArea = el('div', { className: 'main-content-area', id: 'main-content-area' });
    mainViewport.appendChild(contentArea);
    appGrid.appendChild(mainViewport);

    // Right Panel
    const rightPanel = renderRightPanel();
    appGrid.appendChild(rightPanel);

    // Bottom Player
    const playerBar = renderPlayerBar();
    appGrid.appendChild(playerBar);

    // Bottom Nav (Mobile Only)
    const bottomNav = el('div', { id: 'bottom-nav' });
    bottomNav.innerHTML = `
      <div class="bottom-nav-item active" id="bnav-home">
        ${icons.home}
        <span>Home</span>
      </div>
      <div class="bottom-nav-item" id="bnav-search">
        ${icons.search}
        <span>Search</span>
      </div>
      <div class="bottom-nav-item" id="bnav-library">
        ${icons.library}
        <span>Library</span>
      </div>
    `;
    appGrid.appendChild(bottomNav);

    root.appendChild(appGrid);
    isAppInitialized = true;

    // Global URL Input & Toggle handler
    const urlInput = document.getElementById('global-url-input');
    const searchTrigger = document.getElementById('header-search-trigger');
    const offlineToggle = document.getElementById('offline-mode-toggle');
    const profileTrigger = document.getElementById('user-profile-trigger');

    const triggerScrape = () => {
      const query = urlInput.value.trim();
      if (!query) return;

      urlInput.value = '';
      
      // Smart Detector: If it looks like a URL, import it. Otherwise, search it.
      if (query.startsWith('http://') || query.startsWith('https://')) {
        const offline = offlineToggle.checked;
        navigate('');
        setTimeout(() => window.dispatchEvent(new CustomEvent('global-url-submit', { detail: { url: query, offline } })), 50);
      } else {
        navigate(`search/${encodeURIComponent(query)}`);
      }
    };

    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') triggerScrape();
    });

    searchTrigger.addEventListener('click', triggerScrape);
    profileTrigger.addEventListener('click', () => navigate('user'));

    // Bottom Nav handlers
    const updateBNav = (path) => {
      document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
      if (path === '' || path === 'home') document.getElementById('bnav-home')?.classList.add('active');
      else if (path === 'search') document.getElementById('bnav-search')?.classList.add('active');
      else if (path === 'library') document.getElementById('bnav-library')?.classList.add('active');
    };

    document.getElementById('bnav-home').addEventListener('click', () => { navigate(''); updateBNav(''); });
    document.getElementById('bnav-search').addEventListener('click', () => {
      document.getElementById('global-url-input')?.focus();
      updateBNav('search');
    });
    document.getElementById('bnav-library').addEventListener('click', () => { navigate('library'); updateBNav('library'); });

    // Folder connection button in header
    const folderBtn = document.getElementById('connect-folder-header-btn');
    folderBtn.addEventListener('click', async () => {
      const success = await fsService.promptForDirectory();
      if (success) {
        // showToast is assumed to be global or imported
        alert('Library folder connected!');
      }
    });
  }

  // Handle View Routing
  const contentArea = document.getElementById('main-content-area');
  contentArea.innerHTML = '';
  
  updateSidebarActiveNav(route.path);

  switch (route.path) {
    case 'collection':
    case 'player': // Legacy fallback
      state.currentPage = 'collection';
      await renderCollection(contentArea, route.param);
      break;
    case 'library':
      state.currentPage = 'library';
      await renderLibrary(contentArea);
      break;
    case 'search':
      state.currentPage = 'search';
      await renderSearch(contentArea, decodeURIComponent(route.param));
      break;
    case 'user':
      state.currentPage = 'user';
      const { renderUserPage } = await import('./pages/user.js');
      await renderUserPage(contentArea);
      break;
    default:
      state.currentPage = 'home';
      await renderLanding(contentArea);
      break;
  }
}

// ===================== Login Modal =====================
function renderLoginModal(root) {
  root.innerHTML = '';

  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'modal' });

  modal.innerHTML = `
    <div style="text-align:center; margin-bottom: 24px;">
      <div style="display:inline-flex; width:48px; height:48px; margin-bottom: 12px; color:var(--accent);">${icons.headphones}</div>
      <h2 style="font-size:2rem; font-weight:800; letter-spacing:-0.03em;">AnyAudio</h2>
    </div>
    <p style="text-align: center; color:var(--text-secondary);">Your universal audio library.</p>
    <div style="margin-bottom: 16px;">
      <input type="text" class="input" id="login-username" placeholder="Enter your name to login" autocomplete="off" autofocus />
    </div>
    <button class="btn btn-primary w-full" id="login-btn" style="width:100%; border-radius:var(--radius-full); padding:16px;">
      Start Listening
    </button>
  `;

  overlay.appendChild(modal);
  root.appendChild(overlay);

  const loginBtn = document.getElementById('login-btn');
  const input = document.getElementById('login-username');

  const doLogin = async () => {
    const username = input.value.trim();
    if (!username) return;

    loginBtn.disabled = true;
    loginBtn.innerHTML = 'Logging in...';

    try {
      const user = await api.login(username);
      state.user = user;
      storage.setSession(user);
      
      // Attempt to load the File System silently, but don't block
      await fsService.init();

      handleRoute();
    } catch (err) {
      alert('Login failed: ' + err.message);
      loginBtn.disabled = false;
      loginBtn.innerHTML = 'Start Listening';
    }
  };

  loginBtn.addEventListener('click', doLogin);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doLogin();
  });
}

// ===================== Init =====================
window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', handleRoute);
