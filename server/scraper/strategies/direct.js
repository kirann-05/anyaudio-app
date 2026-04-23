const axios = require('axios');

/**
 * Handle direct audio/video URLs (e.g. .mp3, .mp4 files)
 * Probes the URL for metadata and returns a single-track collection
 */
async function scrapeDirect(url) {
  try {
    // HEAD request to get metadata
    const response = await axios.head(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const contentType = response.headers['content-type'] || 'audio/mpeg';
    const contentLength = response.headers['content-length'];

    // Extract filename from URL
    const urlPath = new URL(url).pathname;
    const filename = decodeURIComponent(urlPath.split('/').pop() || 'Unknown Track');
    const title = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');

    return {
      title: title,
      sourceUrl: url,
      tracks: [{
        id: 0,
        title: title,
        audioUrl: url,
        duration: null,
        transcript: null,
        contentType,
        fileSize: contentLength ? parseInt(contentLength) : null,
      }],
    };
  } catch (err) {
    console.error('Direct scrape error:', err.message);
    // Even if HEAD fails, return the URL as a track
    const filename = new URL(url).pathname.split('/').pop() || 'Audio Track';
    return {
      title: filename.replace(/\.[^.]+$/, ''),
      sourceUrl: url,
      tracks: [{
        id: 0,
        title: filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        audioUrl: url,
        duration: null,
        transcript: null,
      }],
    };
  }
}

module.exports = { scrapeDirect };
