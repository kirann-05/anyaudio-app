const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');

const MEDIA_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv'];
const ALL_MEDIA_EXTENSIONS = [...MEDIA_EXTENSIONS, ...VIDEO_EXTENSIONS, '.m3u8'];

const NOISE_KEYWORDS = ['pixel', 'tracking', 'analytics', 'status', 'success', 'failure', 'open', 'ping', 'log', 'telemetry'];

/**
 * Check if a URL's *path* ends with a known media extension.
 */
function hasMediaExtension(urlStr) {
  try {
    const pathname = new URL(urlStr).pathname.toLowerCase();
    return ALL_MEDIA_EXTENSIONS.some(ext => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * Perform a HEAD request to verify if a URL is actually a media file.
 */
async function isValidMediaUrl(urlStr) {
  try {
    const lowUrl = urlStr.toLowerCase();
    
    // 1. Keyword filter (fast)
    if (NOISE_KEYWORDS.some(k => lowUrl.includes(k))) return false;

    // 2. Head request validation
    const response = await axios.head(urlStr, { 
      timeout: 5000, 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': new URL(urlStr).origin
      },
      validateStatus: false // Don't throw on 404, etc.
    });
    
    const contentType = (response.headers['content-type'] || '').toLowerCase();
    const isMedia = contentType.startsWith('audio/') || 
                    contentType.startsWith('video/') || 
                    contentType.includes('mpegurl') || 
                    contentType.includes('application/x-mpegurl') ||
                    contentType.includes('octet-stream'); // Some servers use this for mp3

    if (isMedia) return true;

    // 3. Fallback: If HEAD failed or returned generic type, but extension is very specific
    if (hasMediaExtension(urlStr)) return true;

    return false;
  } catch (err) {
    // If HEAD fails (e.g. 405 Method Not Allowed), fallback to extension check
    return hasMediaExtension(urlStr);
  }
}

/**
 * Generic website scraper using Puppeteer.
 * Handles: pages with <audio>/<video> players, direct .mp3 links, 
 * data-src attributes, and network-intercepted media requests.
 */
async function scrapeGeneric(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Network interception — capture real media URLs (path must end in media ext)
    const networkMediaUrls = [];
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const rUrl = request.url();
      const rType = request.resourceType();

      if (rType === 'media' || (hasMediaExtension(rUrl) && rType !== 'image')) {
        networkMediaUrls.push(rUrl);
      }

      // Block heavy resources for speed
      if (rType === 'image' || rUrl.includes('googlesyndication') ||
          rUrl.includes('googletagmanager') || rUrl.includes('doubleclick') ||
          rUrl.includes('facebook.net')) {
        request.abort();
      } else {
        request.continue();
      }
    });

    console.log('  📄 Loading page...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

    // Wait for dynamic audio players to load (many sites inject <audio> via JS)
    await delay(4000);

    // CRITICAL: Extract audio sources from live DOM via Puppeteer (not cheerio)
    // This catches dynamically-set src attributes that cheerio can't see
    const liveAudioSources = await page.evaluate(() => {
      const sources = [];
      // <audio> elements
      document.querySelectorAll('audio').forEach(el => {
        if (el.src) sources.push(el.src);
        if (el.currentSrc) sources.push(el.currentSrc);
        if (el.dataset.src) sources.push(el.dataset.src);
      });
      // <source> inside audio/video
      document.querySelectorAll('audio source, video source').forEach(el => {
        if (el.src) sources.push(el.src);
      });
      // <video> elements
      document.querySelectorAll('video').forEach(el => {
        if (el.src) sources.push(el.src);
        if (el.currentSrc) sources.push(el.currentSrc);
      });
      // data-src, data-url, data-audio, data-file on any element
      document.querySelectorAll('[data-src], [data-url], [data-audio], [data-file]').forEach(el => {
        const v = el.dataset.src || el.dataset.url || el.dataset.audio || el.dataset.file;
        if (v) sources.push(v);
      });
      return sources;
    });

    // Resolve relative URLs from live sources
    const resolvedLiveSources = liveAudioSources
      .map(s => { try { return new URL(s, url).href; } catch { return s; } })
      .filter(s => s.startsWith('http') && hasMediaExtension(s));

    console.log(`  🔊 Live DOM audio sources: ${resolvedLiveSources.length}`);

    // Now parse static HTML with cheerio for <a> links
    const html = await page.content();
    const pageTitle = await page.title();
    const $ = cheerio.load(html);

    const domLinkUrls = extractMediaLinksFromDOM($, url);
    console.log(`  🔗 DOM link media: ${domLinkUrls.length}`);

    // Combine all sources
    const rawMediaUrls = [...new Set([...resolvedLiveSources, ...networkMediaUrls, ...domLinkUrls])];
    console.log(`  📊 Found ${rawMediaUrls.length} potential media URLs. Validating...`);

    // Extract Transcript (main paragraphs)
    let transcript = '';
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 50) { // Only take substantial paragraphs
        transcript += text + '\n\n';
      }
    });
    if (transcript.length < 100) transcript = null;
    if (transcript) console.log(`  📝 Extracted transcript (${Math.round(transcript.length / 1024)} KB)`);

    // Validate URLs in parallel with concurrency limit or just fast-track known extensions
    const validationResults = await Promise.all(rawMediaUrls.map(async (u) => {
      // FAST TRACK: If it clearly ends in .mp3, .m4a, etc, just accept it to save time
      if (hasMediaExtension(u)) return { url: u, isValid: true };
      return { url: u, isValid: await isValidMediaUrl(u) };
    }));

    const allMediaUrls = validationResults.filter(r => r.isValid).map(r => r.url);
    console.log(`  ✅ ${allMediaUrls.length} unique media URLs passed validation.`);

    // Build track list
    const linkedTracks = extractLinkedTracks($, url);
    let tracks = [];

    if (linkedTracks.length > 0) {
      // Prefer tracks found via <a> links (they have better titles)
      tracks = linkedTracks;
    }

    // Add any media URLs that aren't already in the linked tracks
    const existingUrls = new Set(tracks.map(t => t.audioUrl));
    allMediaUrls.forEach(mediaUrl => {
      if (!existingUrls.has(mediaUrl)) {
        tracks.push({
          id: tracks.length,
          title: titleFromUrl(mediaUrl) || `Track ${tracks.length + 1}`,
          audioUrl: mediaUrl,
          duration: null,
        });
      }
    });

    // Pagination
    const paginationLinks = extractPaginationLinks($, url);
    if (paginationLinks.length > 0 && tracks.length > 0) {
      console.log(`  📑 Scraping ${paginationLinks.length} more pages...`);
      for (const pageUrl of paginationLinks) {
        try {
          await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          await delay(2000);
          const $p = cheerio.load(await page.content());
          const pageTracks = extractLinkedTracks($p, pageUrl);
          if (pageTracks.length > 0) {
            tracks.push(...pageTracks.map((t, i) => ({ ...t, id: tracks.length + i })));
          }
        } catch (e) {
          console.warn(`  ⚠️ Page failed: ${e.message}`);
        }
      }
    }

    // Deduplicate and re-index
    const seen = new Set();
    tracks = tracks.filter(t => {
      if (!t.audioUrl || seen.has(t.audioUrl)) return false;
      seen.add(t.audioUrl);
      return true;
    }).map((t, i) => ({ ...t, id: i }));

    // Assign transcript to the first track
    if (tracks.length > 0 && transcript) {
      tracks[0].transcript = transcript;
    }

    await browser.close();

    console.log(`  ✅ Final track count: ${tracks.length}`);
    return {
      title: cleanTitle(pageTitle) || 'Untitled Collection',
      sourceUrl: url,
      tracks,
    };

  } catch (err) {
    if (browser) await browser.close();
    throw err;
  }
}

// ===================== DOM Helpers =====================

function extractMediaLinksFromDOM($, baseUrl) {
  const urls = new Set();

  // <a> links to media files
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && hasMediaExtension(resolve(href, baseUrl))) {
      urls.add(resolve(href, baseUrl));
    }
  });

  return [...urls];
}

function extractLinkedTracks($, baseUrl) {
  const tracks = [];
  const seen = new Set();

  $('a[href]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    if (!href) return;

    const resolved = resolve(href, baseUrl);
    if (!hasMediaExtension(resolved)) return;
    if (seen.has(resolved)) return;
    seen.add(resolved);

    let text = $el.text().trim();
    if (!text || text.length < 2) {
      text = $el.closest('li, tr, div').text().trim();
    }
    const title = cleanTrackTitle(text) || titleFromUrl(resolved) || `Track ${tracks.length + 1}`;

    tracks.push({ id: tracks.length, title, audioUrl: resolved, duration: null });
  });

  return tracks;
}

function extractPaginationLinks($, baseUrl) {
  const links = new Set();
  const selectors = [
    '.pagination a', '.pager a', '.page-numbers a', 'nav.pagination a',
    '.wp-pagenavi a', 'a.page-link', '[class*="pagination"] a',
    'a[href*="page/"]', 'a[rel="next"]',
  ];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const r = resolve(href, baseUrl);
        if (r !== baseUrl) links.add(r);
      }
    });
  }
  return [...links];
}

// ===================== Utilities =====================

function resolve(url, base) {
  try { return new URL(url, base).href; } catch { return url; }
}

function cleanTitle(title) {
  if (!title) return '';
  return title.replace(/\s*[-|–].*$/i, '').replace(/\s+/g, ' ').trim();
}

function cleanTrackTitle(text) {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > 2 && clean.length < 200 ? clean : '';
}

function titleFromUrl(url) {
  try {
    const filename = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
    return filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim() || null;
  } catch { return null; }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { scrapeGeneric };
