const axios = require('axios');
const puppeteer = require('puppeteer');
const { runYtDlp } = require('./streaming');

/**
 * Handle Spotify URLs by fetching metadata via oEmbed,
 * then performing a YouTube search via yt-dlp to find the equivalent stream.
 */
async function scrapeSpotify(url) {
  const isPlaylist = url.includes('/playlist/') || url.includes('/album/');
  
  if (isPlaylist) {
    return await scrapeSpotifyPlaylist(url);
  }

  console.log('  🟢 Spotify track link detected. Fetching metadata via oEmbed...');
  let title = '';
  
  try {
    // 1. Fetch metadata via Spotify's public oEmbed endpoint
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await axios.get(oembedUrl, { timeout: 10000 });
    title = response.data.title;
  } catch (err) {
    console.log('  🟡 oEmbed failed. Falling back to Puppeteer to extract title...');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      title = await page.title();
      // Remove generic " | Spotify" or "- podcast" from title
      title = title.replace(/\| Spotify/gi, '').replace(/- podcast/gi, '').trim();
    } catch (pErr) {
      console.warn('  ⚠️ Puppeteer failed to get title:', pErr.message);
    } finally {
      await browser.close();
    }
  }

  try {
    if (!title) {
      throw new Error('Could not extract Spotify title via any method.');
    }

    console.log(`  🎵 Spotify Title: "${title}"`);
    console.log('  🔍 Searching YouTube for equivalent audio stream...');

    // 2. Search YouTube for the title using yt-dlp
    const query = `ytsearch1:${title}`;
    const raw = await runYtDlp([
      '--dump-json',
      '--flat-playlist',
      '--no-warnings',
      '--no-check-certificates',
      query
    ], 60000);

    const lines = raw.trim().split('\n').filter(Boolean);
    const info = JSON.parse(lines[0]);

    if (!info || !info.url && !info.webpage_url && !info.id) {
      throw new Error('YouTube search returned no results for this Spotify track');
    }

    const ytdlpUrl = `ytdlp://${info.url || info.webpage_url || info.id}`;

    return {
      title: title,
      sourceUrl: url,
      tracks: [{
        id: 0,
        title: title,
        audioUrl: ytdlpUrl,
        duration: info.duration || null,
        transcript: null
      }]
    };

  } catch (err) {
    console.error('  ❌ Spotify fallback error:', err.message);
    throw new Error('Failed to resolve Spotify link via YouTube fallback: ' + err.message);
  }
}

/**
 * Scrape a Spotify Playlist or Album using Puppeteer
 */
async function scrapeSpotifyPlaylist(url) {
  console.log('  🟢 Spotify Playlist/Album detected. Launching Puppeteer...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  
  try {
    const page = await browser.newPage();
    // Set a common viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log(`  🌐 Loading Spotify URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Extract Playlist Title
    const playlistTitle = await page.title().then(t => t.replace(/\| Spotify/gi, '').replace(/- playlist/gi, '').replace(/- album/gi, '').trim());
    console.log(`  📂 Playlist Title: "${playlistTitle}"`);

    // Extract Track Titles and Artists
    // Spotify's DOM for playlists/albums usually uses [data-testid="track-row"]
    // We wait for it to appear
    await page.waitForSelector('[data-testid="track-row"]', { timeout: 10000 }).catch(() => {
      console.warn('  ⚠️ Could not find track rows. The page might be protected or private.');
    });

    const trackInfos = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[data-testid="track-row"]'));
      return rows.map(row => {
        // Track title is usually in a div with dir="auto" or a specific class
        const titleEl = row.querySelector('div[dir="auto"]') || row.querySelector('a[href*="/track/"] div');
        const artistEls = Array.from(row.querySelectorAll('a[href*="/artist/"]'));
        
        return {
          title: titleEl?.innerText?.trim() || 'Unknown Track',
          artists: artistEls.map(a => a.innerText.trim()).join(', ') || 'Unknown Artist'
        };
      });
    });

    await browser.close();

    if (trackInfos.length === 0) {
      throw new Error('No tracks found in this Spotify playlist/album.');
    }

    console.log(`  ✅ Found ${trackInfos.length} tracks. Resolving via YouTube...`);

    // For each track, resolve it (using concurrency to speed it up)
    const tracks = [];
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < trackInfos.length; i += BATCH_SIZE) {
      const batch = trackInfos.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async (info, index) => {
        const query = `ytsearch1:${info.title} ${info.artists}`;
        try {
          const raw = await runYtDlp([
            '--dump-json',
            '--flat-playlist',
            '--no-warnings',
            '--no-check-certificates',
            query
          ], 30000);

          const lines = raw.trim().split('\n').filter(Boolean);
          const ytInfo = JSON.parse(lines[0]);
          
          return {
            id: i + index,
            title: `${info.title} - ${info.artists}`,
            audioUrl: `ytdlp://${ytInfo.url || ytInfo.webpage_url || ytInfo.id}`,
            duration: ytInfo.duration || null,
            transcript: null
          };
        } catch (err) {
          console.warn(`  ⚠️ Failed to resolve track: ${info.title} - ${info.artists}`);
          return null;
        }
      }));
      
      tracks.push(...results.filter(Boolean));
      console.log(`  ⏳ Progress: ${tracks.length}/${trackInfos.length} tracks resolved...`);
    }

    return {
      title: playlistTitle,
      sourceUrl: url,
      tracks: tracks
    };

  } catch (err) {
    if (browser) await browser.close();
    console.error('  ❌ Spotify Playlist error:', err.message);
    throw new Error('Failed to import Spotify playlist: ' + err.message);
  }
}

module.exports = { scrapeSpotify };
