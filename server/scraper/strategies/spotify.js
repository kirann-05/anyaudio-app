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
  let coverUrl = null;
  
  try {
    // 1. Fetch metadata via Spotify's public oEmbed endpoint
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await axios.get(oembedUrl, { timeout: 10000 });
    title = response.data.title;
    coverUrl = response.data.thumbnail_url || null;
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
    if (lines.length === 0) throw new Error('No YouTube results found for this Spotify track');
    
    let info = null;
    try { info = JSON.parse(lines[0]); } catch(e) { throw new Error('Invalid response from YouTube search'); }
    
    if (!info) throw new Error('YouTube search returned no data');

    const ytdlpUrl = `ytdlp://${info.url || info.webpage_url || info.id}`;
    let duration = info.duration || null;
    let finalTitle = title;
    let finalAudioUrl = ytdlpUrl;

    // 3. Smart Fallback: If YouTube result is too short for a discourse, try Archive.org
    const isLikelyLongDiscourse = title.toLowerCase().match(/geeta|gita|discourses|maha|lecture|satsang|osho/);
    if (isLikelyLongDiscourse && (!duration || duration < 600)) { // Less than 10 mins
      console.log('  ⚠️ YouTube match is too short for a discourse. Trying Archive.org fallback...');
      const archiveResult = await searchArchiveOrg(title);
      if (archiveResult) {
        console.log(`  🏛️ Found full version on Archive.org: "${archiveResult.title}"`);
        finalAudioUrl = archiveResult.url;
        duration = archiveResult.duration || duration;
        finalTitle = archiveResult.title || finalTitle;
      }
    }

    return {
      title: finalTitle,
      sourceUrl: url,
      tracks: [{
        id: 0,
        title: finalTitle,
        audioUrl: finalAudioUrl,
        duration: duration,
        coverUrl: coverUrl,
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
    // Use a real browser user agent to avoid "Page not found" / bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log(`  🌐 Loading Spotify URL: ${url}`);
    // Try with domcontentloaded first for speed, then wait for content
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for the main content to appear (track rows or title)
    try {
      await page.waitForSelector('[data-testid="track-row"], [role="row"], .tracklist-row, [data-testid="playlist-tracklist"]', { timeout: 15000 });
    } catch (e) {
      console.warn('  ⚠️ Timeout waiting for track rows. Content might be dynamic or restricted.');
    }

    // Try to get title from meta or title tag
    const playlistTitle = await page.evaluate(() => {
      return document.querySelector('meta[property="og:title"]')?.content || 
             document.querySelector('h1')?.innerText || 
             document.title.replace(/\| Spotify/gi, '').replace(/- playlist/gi, '').replace(/- album/gi, '').trim();
    });
    
    console.log(`  📂 Playlist Title: "${playlistTitle}"`);

    // Extract Track Titles and Artists
    // Spotify's DOM for playlists/albums usually uses [data-testid="track-row"]
    // We wait for it to appear
    await page.waitForSelector('[data-testid="track-row"]', { timeout: 10000 }).catch(() => {
      console.warn('  ⚠️ Could not find track rows. The page might be protected or private.');
    });

    const trackInfos = await page.evaluate(() => {
      // Try multiple selectors as Spotify often changes their class names
      const rows = Array.from(document.querySelectorAll('[data-testid="track-row"], [role="row"], .tracklist-row'));
      return rows.map(row => {
        // Track title: look for specific data-testid or common link patterns
        const titleEl = row.querySelector('[data-testid="internal-track-link"] div, div[dir="auto"], .tracklist-name, a[href*="/track/"] div');
        const artistEls = Array.from(row.querySelectorAll('a[href*="/artist/"], .tracklist-row__artist-name-link'));
        
        const title = titleEl?.innerText?.trim();
        if (!title) return null; // Skip non-track rows

        return {
          title: title,
          artists: artistEls.map(a => a.innerText.trim()).join(', ') || 'Unknown Artist'
        };
      }).filter(Boolean);
    });

    if (trackInfos.length === 0) {
      console.log('  ⚠️ No tracks found via Puppeteer selectors. Checking HTML directly...');
      const html = await page.content();
      await browser.close();
      
      if (html.includes('login-button')) {
        throw new Error('Spotify is blocking the scraper with a login wall. Try a different playlist or a YouTube playlist instead.');
      }
      throw new Error('No tracks found in this Spotify playlist/album.');
    }

    await browser.close();

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
          if (lines.length === 0) return null;
          
          let ytInfo = null;
          try { ytInfo = JSON.parse(lines[0]); } catch(e) { return null; }
          
          if (!ytInfo) return null;
          
          return {
            id: i + index,
            title: `${info.title} - ${info.artists}`,
            audioUrl: `ytdlp://${ytInfo.url || ytInfo.webpage_url || ytInfo.id}`,
            duration: ytInfo.duration || null,
            coverUrl: ytInfo.thumbnail || null,
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

/**
 * Search Archive.org for a match
 */
async function searchArchiveOrg(query) {
  console.log(`  🏛️ Searching Archive.org for: "${query}"...`);
  try {
    const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier,title,mediatype&rows=5&output=json`;
    const response = await axios.get(searchUrl, { timeout: 10000 });
    const docs = response.data.response.docs;

    if (!docs || docs.length === 0) return null;

    // Filter for audio/video matches
    const bestDoc = docs.find(d => d.mediatype === 'audio' || d.mediatype === 'video') || docs[0];
    
    // Get metadata for the specific identifier
    const metadataUrl = `https://archive.org/metadata/${bestDoc.identifier}`;
    const metaRes = await axios.get(metadataUrl, { timeout: 10000 });
    const files = metaRes.data.files;

    // Find the best audio file (prefer .mp3 or .mp4)
    const audioFile = files.find(f => f.name.endsWith('.mp3')) || files.find(f => f.name.endsWith('.mp4'));
    
    if (audioFile) {
      const audioUrl = `https://archive.org/download/${bestDoc.identifier}/${audioFile.name}`;
      return {
        title: bestDoc.title,
        url: audioUrl,
        duration: audioFile.length ? parseInt(audioFile.length) : null,
        coverUrl: `https://archive.org/services/img/${bestDoc.identifier}`
      };
    }
  } catch (err) {
    console.warn('  ⚠️ Archive.org search failed:', err.message);
  }
  return null;
}

module.exports = { scrapeSpotify };
