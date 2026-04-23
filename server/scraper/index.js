const { scrapeGeneric } = require('./strategies/generic');
const { scrapeDirect } = require('./strategies/direct');
const { scrapeStreaming } = require('./strategies/streaming');
const { scrapeSpotify } = require('./strategies/spotify');

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

    // 3. Generic website (Puppeteer)
    console.log('  🌐 Generic website scraping...');
    return await scrapeGeneric(url);

  } catch (err) {
    console.error('Scraper error:', err.message);
    throw new Error('Failed to scrape URL: ' + err.message);
  }
}

module.exports = { scrape };
