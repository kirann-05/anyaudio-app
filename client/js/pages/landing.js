import { el, showToast, timeAgo } from '../utils/dom.js';
import { state, navigate } from '../app.js';
import * as api from '../services/api.js';
import { icons } from '../utils/icons.js';
import { refreshSidebarLibrary } from '../components/sidebar.js';
import { fsService } from '../services/fs.js';
import { downloadManager } from '../services/downloadManager.js';

let cleanupGlobalListener = null;

export async function renderLanding(container) {
  const page = el('div', { style: { paddingBottom: '60px' } });

  // Status area for scraping
  const statusArea = el('div', { id: 'scrape-status', style: { marginBottom: '24px', minHeight: '10px' } });
  page.appendChild(statusArea);

  // Recent Collections
  const recentSection = el('div');
  const recentHeader = el('div', {
    style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
  });
  recentHeader.innerHTML = `
    <h2 class="title-xl" style="margin:0;">Good evening</h2>
  `;
  recentSection.appendChild(recentHeader);

  const collectionsGrid = el('div', { className: 'collections-grid', id: 'collections-grid' });
  recentSection.appendChild(collectionsGrid);

  page.appendChild(recentSection);
  container.appendChild(page);

  // Load Collections
  loadCollections(collectionsGrid);

  // Global URL listener
  const handleUrlSubmit = async (e) => {
    const { url, offline } = e.detail;
    if (!url) return;
    
    // Show scraping status
    statusArea.innerHTML = '';
    const status = el('div', { className: 'scraping-status', style: { borderRadius:'var(--radius-full)' } });
    const isPlaylist = url.includes('list=') || url.includes('/playlist/') || url.includes('/album/');
    status.innerHTML = `<div class="loading-spinner" style="width:20px;height:20px;border-width:2px;"></div><span>${isPlaylist ? 'Importing playlist tracks...' : 'Scraping content from URL...'}</span>`;
    statusArea.appendChild(status);

    try {
      const collection = await api.scrapeUrl(url, state.user.id);
      
      statusArea.innerHTML = '';
      showToast(`Found ${collection.tracks.length} tracks!`, 'success');

      if (offline) {
        if (!fsService.isReady) {
          showToast('Please select a local folder for downloads first', 'info');
          const success = await fsService.promptForDirectory();
          if (!success) {
             showToast('Download cancelled', 'error');
             return;
          }
        }

        showToast('Starting offline download...', 'info');
        downloadManager.startDownload(collection);
      }

      // Refresh both grid and sidebar
      loadCollections(collectionsGrid);
      refreshSidebarLibrary();

      // Navigate to the new collection
      setTimeout(() => navigate(`collection/${collection.id}`), 500);

    } catch (err) {
      statusArea.innerHTML = '';
      showToast(err.message, 'error');
    }
  };

  window.addEventListener('global-url-submit', handleUrlSubmit);

  // Expose cleanup function to router if we needed it, 
  // but since landing might be re-rendered, we must clean up old listeners.
  if (window._landingListener) {
    window.removeEventListener('global-url-submit', window._landingListener);
  }
  window._landingListener = handleUrlSubmit;
}

async function loadCollections(grid) {
  if (!state.user) return;

  try {
    const collections = await api.getCollections(state.user.id);

    if (collections.length === 0) {
      grid.innerHTML = '';
      const empty = el('div', { className: 'empty-state', style: { gridColumn: '1 / -1', marginTop: '40px' } });
      empty.innerHTML = `
        <div class="empty-icon" style="display:inline-flex; width:64px; height:64px; opacity:0.5;">${icons.search}</div>
        <h3 style="margin-top:16px;">Ready to build your library</h3>
        <p style="max-width:400px; margin:0 auto;">Paste any website URL or audio link into the search bar above to scrape and extract the audio tracks.</p>
      `;
      grid.appendChild(empty);
      return;
    }

    grid.innerHTML = '';
    collections.forEach(col => {
      const card = el('div', { className: 'card' });

      card.innerHTML = `
        <div class="card-image-wrap" style="background: none; border: none; padding: 0; box-shadow: none;">
          <div class="premium-cover">
            ${col.cover_url 
              ? `<img src="${col.cover_url}" alt="${escapeHtml(col.title)}">` 
              : `<div class="premium-cover-fallback"><span>${col.title.charAt(0).toUpperCase()}</span></div>`
            }
            <div class="card-play-btn" style="position:absolute; top:50%; left:50%;">${icons.play}</div>
          </div>
        </div>
        <div class="card-title" style="margin-top:12px;">${escapeHtml(col.title)}</div>
        <div class="card-subtitle">Collection • ${col.tracks?.length || 0} tracks</div>
      `;

      card.addEventListener('click', () => navigate(`collection/${col.id}`));

      // Directly clicking play starts audio
      card.querySelector('.card-play-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        // Just navigate to the collection view
        navigate(`collection/${col.id}`);
      });

      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load collections:', err);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
