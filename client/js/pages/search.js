/**
 * Search Results Page
 */
import { el, showToast } from '../utils/dom.js';
import { state, navigate } from '../app.js';
import * as api from '../services/api.js';
import { icons } from '../utils/icons.js';
import { audioEngine } from '../services/audio.js';

export async function renderSearch(container, query) {
  const page = el('div', { className: 'container', style: { padding: '40px 0' } });
  
  const header = el('div', { style: { marginBottom: '40px' } });
  header.innerHTML = `
    <h1 style="font-size:2.5rem; font-weight:900; letter-spacing:-0.04em;">Search Results</h1>
    <p style="color:var(--text-secondary);">Showing top results for "${query}"</p>
  `;
  page.appendChild(header);

  const resultsArea = el('div', { id: 'search-results-list' });
  resultsArea.innerHTML = '<div class="loading-spinner"></div>';
  page.appendChild(resultsArea);
  
  container.appendChild(page);

  try {
    const results = await api.search(query);
    resultsArea.innerHTML = '';

    if (results.length === 0) {
      resultsArea.innerHTML = `<div class="empty-state"><h3>No results found</h3><p>Try searching for something else.</p></div>`;
      return;
    }

    const grid = el('div', { className: 'collections-grid' });
    results.forEach(res => {
      const card = el('div', { className: 'card' });
      card.innerHTML = `
        <div class="card-image-wrap">
          <div class="premium-cover">
            ${res.thumbnail ? `<img src="${res.thumbnail}" alt="" onerror="this.style.display='none';">` : ''}
            <div class="premium-cover-fallback"><span>${res.title.charAt(0).toUpperCase()}</span></div>
            <div class="card-play-btn">${icons.play}</div>
          </div>
        </div>
        <div class="card-title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${res.title}</div>
        <div class="card-subtitle">${res.uploader}</div>
        <button class="btn btn-primary btn-sm w-full import-btn" style="margin-top:12px;">Play Now</button>
      `;

      card.querySelector('.import-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const btn = e.target;
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner-sm"></div> Playing...';
        
        try {
          // Instant Scrape & Play
          const collection = await api.scrape(res.url, state.user.id);
          
          if (collection && collection.tracks && collection.tracks.length > 0) {
            audioEngine.loadCollection(collection.id, collection.title, collection.tracks, 0);
            audioEngine.play();
            showToast(`Now playing: ${collection.title}`, 'success');
          }
        } catch (err) {
          showToast('Failed to start playback', 'error');
          btn.disabled = false;
          btn.textContent = 'Play Now';
        }
      });

      card.addEventListener('click', () => {
        card.querySelector('.import-btn').click();
      });

      grid.appendChild(card);
    });
    resultsArea.appendChild(grid);

  } catch (err) {
    resultsArea.innerHTML = `<div class="empty-state"><h3>Search Failed</h3><p>${err.message}</p></div>`;
  }
}
