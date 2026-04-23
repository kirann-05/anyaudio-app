const { scrapeGeneric } = require('./strategies/generic');
const { scrapeDirect } = require('./strategies/direct');

// Audio/video file extensions
const MEDIA_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.mp4', '.webm', '.mkv'];

/**
 * Detect URL type and route to appropriate scraper strategy
 */
async function scrape(url) {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.toLowerCase();

    // Check if it's a direct media file
    const isDirectMedia = MEDIA_EXTENSIONS.some(ext => pathname.endsWith(ext));

    if (isDirectMedia) {
      console.log('  📎 Direct media URL detected');
      return await scrapeDirect(url);
    }

    // Default: generic website scraper
    console.log('  🌐 Generic website scraping...');
    return await scrapeGeneric(url);

  } catch (err) {
    console.error('Scraper error:', err);
    throw new Error('Failed to scrape URL: ' + err.message);
  }
}

module.exports = { scrape };
