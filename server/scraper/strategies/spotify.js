const axios = require('axios');
const puppeteer = require('puppeteer');
const { runYtDlp } = require('./streaming');

/**
 * Handle Spotify URLs by fetching metadata via oEmbed,
 * then performing a YouTube search via yt-dlp to find the equivalent stream.
 */
async function scrapeSpotify(url) {
  console.log('  🟢 Spotify link detected. Fetching metadata via oEmbed...');
  let title = '';
  
  try {
    console.log('  🟢 Spotify link detected. Fetching metadata via oEmbed...');
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

module.exports = { scrapeSpotify };
