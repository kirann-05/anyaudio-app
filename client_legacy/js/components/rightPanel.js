import { el } from '../utils/dom.js';
import { icons } from '../utils/icons.js';
import { audioEngine } from '../services/audio.js';

export function renderRightPanel() {
  const panel = el('div', { id: 'right-panel' });
  
  const header = el('div', { className: 'right-panel-header' });
  header.innerHTML = `
    <span>Transcript</span>
    <button class="btn-icon" id="btn-close-right" title="Close" style="color:var(--text-secondary);">${icons.xCircle}</button>
  `;
  panel.appendChild(header);

  const content = el('div', { className: 'right-panel-content', id: 'right-transcript-content' });
  content.innerHTML = `
    <div class="empty-state" style="padding:40px 20px;">
      <div class="empty-icon" style="display:inline-flex;width:48px;height:48px;opacity:0.3;">${icons.bookOpen}</div>
      <p style="margin-top:16px;">Play a track to view its transcript</p>
    </div>
  `;
  panel.appendChild(content);

  // Wire events
  header.querySelector('#btn-close-right').addEventListener('click', () => {
    document.getElementById('app-grid').classList.remove('has-right-panel');
  });

  audioEngine.addEventListener('trackchange', e => {
    const { track } = e.detail;
    if (track.transcript) {
      content.innerHTML = `<div class="transcript-text" style="font-size:0.938rem;line-height:1.7;">${track.transcript.split(/\n{2,}/).map(p => `<p style="margin-bottom:12px;">${escapeHtml(p)}</p>`).join('')}</div>`;
      // Auto-open panel if transcript is available
      document.getElementById('app-grid').classList.add('has-right-panel');
    } else {
      content.innerHTML = `
        <div class="empty-state" style="padding:40px 20px;">
          <div class="empty-icon" style="display:inline-flex;width:48px;height:48px;opacity:0.3;">${icons.bookOpen}</div>
          <p style="margin-top:16px;">No transcript available for this track</p>
        </div>
      `;
    }
  });

  return panel;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
