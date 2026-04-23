/**
 * AnyAudio — Main Application Controller & SPA Router (Spotify Architecture)
 */

import { storage } from './services/storage.js';
import { fsService } from './services/fs.js';
import { el } from './utils/dom.js';
import { icons } from './utils/icons.js';
import { renderSidebar, updateSidebarActiveNav } from './components/sidebar.js';
import { renderPlayerBar } from './components/playerBar.js';
import { renderRightPanel } from './components/rightPanel.js';

import { renderLanding } from './pages/landing.js';
import { renderCollection } from './pages/collection.js';
import { renderLibrary } from './pages/library.js';

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

  // Check auth
  if (!state.user) {
    const session = storage.getSession();
    if (session) {
      state.user = session;
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
      <div class="header-search" style="display:flex;align-items:center;gap:8px;flex:1;flex-wrap:wrap;">
        <div style="position:relative; flex:1; min-width:200px;">
          <div style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-secondary); pointer-events:none;">${icons.search}</div>
          <input type="text" class="input" id="global-url-input" placeholder="Paste link..." autocomplete="off" style="padding-left:40px; width:100%;" />
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-ghost" id="fetch-stream-btn" style="padding:8px 16px; border-radius:var(--radius-full); font-size:0.875rem; border:1px solid rgba(255,255,255,0.1);">
            Stream Online
          </button>
          <button class="btn btn-accent" id="fetch-download-btn" style="padding:8px 16px; border-radius:var(--radius-full); font-size:0.875rem; display:flex; align-items:center; gap:6px;">
            ${icons.download} Save Offline
          </button>
        </div>
      </div>
      <div class="header-user" style="display:flex; align-items:center; gap:12px; margin-left:16px;">
        <button class="btn btn-ghost btn-sm" id="connect-folder-header-btn" title="Connect Local Folder" style="padding:8px; display:flex; align-items:center; gap:6px;">
          ${icons.folder} <span class="hide-on-mobile" style="font-size:0.75rem; font-weight:500;">Connect Folder</span>
        </button>
        <div class="user-avatar">${state.user.username.charAt(0).toUpperCase()}</div>
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

    root.appendChild(appGrid);
    isAppInitialized = true;

    // Global URL Input handler
    const urlInput = document.getElementById('global-url-input');
    const streamBtn = document.getElementById('fetch-stream-btn');
    const downloadBtn = document.getElementById('fetch-download-btn');

    const triggerScrape = (offline = false) => {
      const url = urlInput.value.trim();
      if (url) {
        urlInput.value = '';
        navigate('');
        setTimeout(() => window.dispatchEvent(new CustomEvent('global-url-submit', { detail: { url, offline } })), 50);
      }
    };

    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') triggerScrape(false);
    });

    streamBtn.addEventListener('click', () => triggerScrape(false));
    downloadBtn.addEventListener('click', () => triggerScrape(true));

    // Folder connection button in header
    const folderBtn = document.getElementById('connect-folder-header-btn');
    folderBtn.addEventListener('click', async () => {
      const success = await fsService.promptForDirectory();
      if (success) {
        showToast('Library folder connected!', 'success');
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
      const { login } = await import('./services/api.js');
      const user = await login(username);
      state.user = user;
      storage.setSession(user);
      
      // Attempt to load the File System silently, but don't block
      const { fsService } = await import('./services/fs.js');
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
