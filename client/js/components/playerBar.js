import { el, formatTime, throttle } from '../utils/dom.js';
import { icons } from '../utils/icons.js';
import { audioEngine } from '../services/audio.js';
import { storage } from '../services/storage.js';
import { state } from '../app.js';

export function renderPlayerBar() {
  const bar = el('div', { id: 'player-bar' });
  
  // Progress bar
  const progressWrapper = el('div', { className: 'player-progress-wrapper', id: 'player-progress-wrapper' });
  progressWrapper.innerHTML = `
    <div class="player-progress-buffered" id="progress-buffered" style="width:0%"></div>
    <div class="player-progress-fill" id="progress-fill" style="width:0%"></div>
    <div class="player-progress-thumb" id="progress-thumb" style="left:0%"></div>
  `;
  bar.appendChild(progressWrapper);

  const row = el('div', { className: 'player-controls-row' });

  // Info (Left)
  const info = el('div', { className: 'player-info' });
  info.innerHTML = `
    <div class="player-cover">${icons.music}</div>
    <div class="player-meta">
      <div class="player-meta-title" id="now-track-title">Select a track</div>
      <div class="player-meta-subtitle" id="now-collection-title">—</div>
    </div>
  `;
  row.appendChild(info);

  // Controls (Center)
  const controls = el('div', { className: 'player-controls' });
  const buttons = el('div', { className: 'player-buttons' });
  
  buttons.innerHTML = `
    <button class="btn-icon" id="btn-skip-back" title="Back 15s">${icons.skipBack}</button>
    <button class="btn-icon" id="btn-prev" title="Previous">${icons.rewind}</button>
    <button class="btn-play" id="btn-play" title="Play">${icons.play}</button>
    <button class="btn-icon" id="btn-next" title="Next">${icons.fastForward}</button>
    <button class="btn-icon" id="btn-skip-fwd" title="Forward 15s">${icons.skipForward}</button>
  `;
  
  const time = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', width: '100%', justifyContent: 'center' } });
  time.innerHTML = `<span id="time-current">0:00</span> <span id="time-total">0:00</span>`;
  
  controls.appendChild(buttons);
  controls.appendChild(time);
  row.appendChild(controls);

  // Actions/Volume (Right)
  const actions = el('div', { className: 'player-actions' });
  
  // Speed selector
  const speedBtn = el('button', { className: 'btn-icon', id: 'btn-speed', style: { fontSize: '0.75rem', fontWeight: 'bold' }, textContent: '1x' });
  const speeds = [1, 1.25, 1.5, 2, 0.5, 0.75];
  let speedIdx = 0;
  speedBtn.addEventListener('click', () => {
    speedIdx = (speedIdx + 1) % speeds.length;
    audioEngine.setSpeed(speeds[speedIdx]);
    speedBtn.textContent = speeds[speedIdx] + 'x';
  });
  
  const volumeControl = el('div', { className: 'volume-bar' });
  volumeControl.innerHTML = `
    <button class="btn-icon" id="btn-volume">${icons.volume2}</button>
    <input type="range" class="volume-slider" id="volume-slider" min="0" max="100" value="100" />
  `;

  actions.appendChild(speedBtn);
  actions.appendChild(volumeControl);
  row.appendChild(actions);

  bar.appendChild(row);

  // --- Wire Events ---
  wireEvents(bar);

  return bar;
}

function wireEvents(bar) {
  const $ = id => bar.querySelector('#' + id);

  // Buttons
  $('btn-play')?.addEventListener('click', () => audioEngine.togglePlay());
  $('btn-next')?.addEventListener('click', () => audioEngine.next());
  $('btn-prev')?.addEventListener('click', () => audioEngine.previous());
  $('btn-skip-fwd')?.addEventListener('click', () => audioEngine.skipForward(15));
  $('btn-skip-back')?.addEventListener('click', () => audioEngine.skipBackward(15));

  // Volume
  $('volume-slider')?.addEventListener('input', e => { 
    audioEngine.setVolume(e.target.value/100); 
    $('btn-volume').innerHTML = e.target.value == 0 ? icons.volumeX : e.target.value < 50 ? icons.volume1 : icons.volume2; 
  });
  $('btn-volume')?.addEventListener('click', () => { 
    const sl = $('volume-slider'); 
    if(audioEngine.volume > 0){
      sl.value = 0; audioEngine.setVolume(0); $('btn-volume').innerHTML = icons.volumeX;
    } else {
      sl.value = 100; audioEngine.setVolume(1); $('btn-volume').innerHTML = icons.volume2;
    } 
  });

  // Seek
  const pw = $('player-progress-wrapper');
  if (pw) {
    let drag = false;
    const seek = e => { const r=pw.getBoundingClientRect(); audioEngine.seekPercent(Math.max(0,Math.min(100,((e.clientX-r.left)/r.width)*100))); };
    pw.addEventListener('mousedown', e => { drag=true; seek(e); });
    document.addEventListener('mousemove', e => { if(drag) seek(e); });
    document.addEventListener('mouseup', () => drag=false);
    pw.addEventListener('touchstart', e => { drag=true; seek(e.touches[0]); });
    document.addEventListener('touchmove', e => { if(drag) seek(e.touches[0]); });
    document.addEventListener('touchend', () => drag=false);
  }

  // Engine Events
  const ttu = throttle(d => { 
    const f=$('progress-fill'), th=$('progress-thumb'), tc=$('time-current'); 
    if(f) f.style.width = d.progress+'%'; 
    if(th) th.style.left = d.progress+'%'; 
    if(tc) tc.textContent = formatTime(d.currentTime); 
  }, 250);

  audioEngine.addEventListener('timeupdate', e => ttu(e.detail));
  audioEngine.addEventListener('durationchange', e => { const t=$('time-total'); if(t) t.textContent=formatTime(e.detail.duration); });
  audioEngine.addEventListener('buffered', e => { const b=$('progress-buffered'); if(b) b.style.width=e.detail.progress+'%'; });
  audioEngine.addEventListener('statechange', e => { const b=$('btn-play'); if(b) b.innerHTML=e.detail.isPlaying?icons.pause:icons.play; });

  audioEngine.addEventListener('trackchange', e => {
    const { track, collectionTitle } = e.detail;
    $('now-track-title').textContent = track.title;
    $('now-collection-title').textContent = collectionTitle;

    [$('progress-fill'), $('progress-thumb')].forEach(x => { if(x) x.style[x.id.includes('fill')?'width':'left']='0%'; });
    if($('time-current')) $('time-current').textContent='0:00'; 
    if($('time-total')) $('time-total').textContent='0:00';
  });

  // Track ended progress save
  audioEngine.addEventListener('trackended', e => {
    if (state.user && audioEngine.collectionId) {
      storage.saveProgressNow(state.user.id, audioEngine.collectionId, e.detail.index + 1, 0);
    }
  });

  // Save progress periodically
  setInterval(() => {
    if (audioEngine.isPlaying && audioEngine.collectionId && state.user) {
      storage.saveProgress(state.user.id, audioEngine.collectionId, audioEngine.currentIndex, audioEngine.currentTime);
    }
  }, 5000);
}
