const axios = require('axios');
const mm = require('music-metadata');

/**
 * Handle direct audio/video URLs (e.g. .mp3, .mp4 files)
 * Probes the URL for metadata and returns a single-track collection
 */
async function scrapeDirect(url) {
  try {
    // 1. HEAD request to get basic headers
    const head = await axios.head(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const contentType = head.headers['content-type'] || 'audio/mpeg';
    const fileSize = head.headers['content-length'] ? parseInt(head.headers['content-length']) : null;

    // 2. GET a small chunk for metadata (first 128KB is usually enough)
    let title = '';
    let duration = null;

    try {
      const response = await axios.get(url, {
        responseType: 'stream',
        headers: { 'Range': 'bytes=0-131071', 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000
      });

      const metadata = await mm.parseStream(response.data, { mimeType: contentType, size: fileSize }, { skipPostProcess: true });
      title = metadata.common.title || '';
      duration = metadata.format.duration ? Math.round(metadata.format.duration) : null;
    } catch (mErr) {
      console.warn('  ⚠️ Metadata extraction failed:', mErr.message);
    }

    // Fallback title from filename
    if (!title) {
      const urlPath = new URL(url).pathname;
      const filename = decodeURIComponent(urlPath.split('/').pop() || 'Unknown Track');
      title = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();
    }

    return {
      title: title || 'Audio File',
      sourceUrl: url,
      tracks: [{
        id: 0,
        title: title || 'Audio File',
        audioUrl: url,
        duration: duration,
        contentType,
        fileSize,
      }],
    };
  } catch (err) {
    console.error('Direct scrape error:', err.message);
    const urlPath = new URL(url).pathname;
    const filename = decodeURIComponent(urlPath.split('/').pop() || 'Audio Track');
    const title = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();

    return {
      title: title,
      sourceUrl: url,
      tracks: [{
        id: 0,
        title: title,
        audioUrl: url,
        duration: null,
      }],
    };
  }
}

module.exports = { scrapeDirect };
