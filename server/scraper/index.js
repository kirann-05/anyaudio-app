const { scrapeGeneric } = require('./strategies/generic');
const { scrapeDirect } = require('./strategies/direct');
const { scrapeStreaming } = require('./strategies/streaming');
const { scrapeSpotify } = require('./strategies/spotify');
const { scrapeOshoWorld } = require('./strategies/oshoworld');

// Direct media file extensions
const MEDIA_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.mp4', '.webm', '.mkv'];

// Streaming platform domains that yt-dlp can handle
const STREAMING_DOMAINS = [
  'youtube.com', 'youtu.be', 'youtube-nocookie.com',  // YouTube
  'music.youtube.com',                                  // YouTube Music
  'soundcloud.com',                                     // SoundCloud
  'bandcamp.com',                                       // Bandcamp
  'vimeo.com',                                          // Vimeo
  'dailymotion.com',                                    // Dailymotion
  'mixcloud.com',                                       // Mixcloud
  'audiomack.com',                                      // Audiomack
  'archive.org',                                        // Internet Archive
];

/**
 * Detect URL type and route to appropriate scraper strategy:
 *   1. Direct media file → direct scraper (fast HEAD probe)
 *   2. Streaming platform → yt-dlp extraction
 *   3. Any other website → Puppeteer generic scraper
 */
async function scrape(url) {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.toLowerCase();
    const hostname = parsedUrl.hostname.toLowerCase();

    // 1. Direct media file link
    const isDirectMedia = MEDIA_EXTENSIONS.some(ext => pathname.endsWith(ext));
    if (isDirectMedia) {
      console.log('  📎 Direct media URL detected');
      return await scrapeDirect(url);
    }

    // 2. Streaming platform (YouTube, SoundCloud, Spotify, etc.)
    const isStreaming = STREAMING_DOMAINS.some(d => hostname.includes(d));
    if (isStreaming) {
      console.log(`  🎬 Streaming platform detected: ${hostname}`);
      return await scrapeStreaming(url);
    }

    // 2b. Spotify Special Handling
    if (hostname.includes('open.spotify.com')) {
      return await scrapeSpotify(url);
    }

    // 2c. Osho World Special Handling
    if (hostname.includes('oshoworld.com')) {
      return await scrapeOshoWorld(url);
    }

    // 3. Generic website (Puppeteer)
    console.log('  🌐 Generic website scraping...');
    return await scrapeGeneric(url);

  } catch (err) {
    console.error('Scraper error:', err.message);
    throw new Error('Failed to scrape URL: ' + err.message);
  }
}

async function search(query) {
  console.log(`  🔍 Global Search: "${query}"`);
  const { runYtDlp } = require('./strategies/streaming');
  
  try {
    const raw = await runYtDlp([
      '--dump-json',
      '--flat-playlist',
      '--no-warnings',
      '--no-check-certificates',
      `ytsearch10:${query}`
    ], 30000);
    
    const lines = raw.trim().split('\n').filter(Boolean);
    return lines.map(line => {
      try {
        const info = JSON.parse(line);
        // Better thumbnail selection: try 'thumbnail', then 'thumbnails' array
        let thumbnail = info.thumbnail;
        if (!thumbnail && info.thumbnails && info.thumbnails.length > 0) {
          thumbnail = info.thumbnails[info.thumbnails.length - 1].url;
        }
        
        return {
          title: info.title,
          url: info.webpage_url || `https://www.youtube.com/watch?v=${info.id}`,
          duration: info.duration || 0,
          thumbnail: thumbnail || null,
          uploader: info.uploader || 'Unknown'
        };
      } catch { return null; }
    }).filter(Boolean);
  } catch (err) {
    console.error('Search error:', err.message);
    return [];
  }
}

module.exports = { scrape, search };
