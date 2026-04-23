const { execFile } = require('child_process');
const path = require('path');

// yt-dlp path — check common locations
const YT_DLP_PATHS = [
  'yt-dlp',                                                          // On PATH
  path.join(process.env.APPDATA || '', 'Python', 'Python313', 'Scripts', 'yt-dlp.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python313', 'Scripts', 'yt-dlp.exe'),
  '/usr/local/bin/yt-dlp',                                           // Linux
  '/usr/bin/yt-dlp',
];

function findYtDlp() {
  // On Render / production, yt-dlp should be installed via pip in Dockerfile
  return process.env.YT_DLP_PATH || 'yt-dlp';
}

function runYtDlp(args, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const bin = findYtDlp();
    execFile(bin, args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        // Try alternate paths on Windows
        if (err.code === 'ENOENT') {
          for (const alt of YT_DLP_PATHS) {
            if (alt === 'yt-dlp') continue;
            try {
              require('fs').accessSync(alt);
              return execFile(alt, args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (e2, out2) => {
                if (e2) reject(e2);
                else resolve(out2);
              });
            } catch { /* try next */ }
          }
        }
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Scrape streaming platforms (YouTube, SoundCloud, etc.) using yt-dlp.
 * Returns track metadata with a special `ytdlp://` audioUrl scheme 
 * that the stream proxy will handle.
 */
async function scrapeStreaming(url) {
  console.log('  🎬 Extracting via yt-dlp...');

  try {
    const raw = await runYtDlp([
      '--dump-json',
      '--flat-playlist',
      '--no-warnings',
      '--no-check-certificates',
      url,
    ], 60000);

    // yt-dlp may return multiple JSON objects (one per line for playlists)
    const lines = raw.trim().split('\n').filter(Boolean);
    const entries = lines.map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    if (entries.length === 0) {
      throw new Error('yt-dlp returned no results');
    }

    // Check if it's a playlist or a single video
    const isPlaylist = entries.length > 1 || entries[0]?._type === 'playlist';
    let title = '';
    let tracks = [];

    if (isPlaylist) {
      // Playlist — entries are individual items
      title = entries[0]?.playlist_title || entries[0]?.playlist || 'Playlist';
      tracks = entries.map((e, i) => ({
        id: i,
        title: e.title || `Track ${i + 1}`,
        audioUrl: `ytdlp://${e.url || e.webpage_url || e.id}`,
        duration: e.duration || null,
      }));
    } else {
      // Single video — get full info with formats
      const info = entries[0];
      title = info.title || 'Unknown';
      tracks = [{
        id: 0,
        title: info.title || 'Unknown',
        audioUrl: `ytdlp://${url}`,
        duration: info.duration || null,
      }];
    }

    console.log(`  ✅ yt-dlp found ${tracks.length} track(s): "${title}"`);
    return { title, sourceUrl: url, tracks };

  } catch (err) {
    console.error('  ❌ yt-dlp error:', err.message);
    throw new Error('Failed to extract from streaming URL: ' + err.message);
  }
}

/**
 * Get the direct audio stream URL for a single video using yt-dlp.
 * This is called by the stream proxy when it encounters a `ytdlp://` URL.
 */
async function getStreamUrl(videoUrl) {
  try {
    const raw = await runYtDlp([
      '--get-url',
      '-f', 'bestaudio[ext=m4a]/bestaudio/best',
      '--no-warnings',
      '--no-check-certificates',
      videoUrl,
    ], 30000);

    const streamUrl = raw.trim().split('\n')[0];
    if (!streamUrl || !streamUrl.startsWith('http')) {
      throw new Error('No valid stream URL returned');
    }
    return streamUrl;
  } catch (err) {
    console.error('  ❌ yt-dlp stream URL error:', err.message);
    throw err;
  }
}

module.exports = { scrapeStreaming, getStreamUrl };
