const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

/**
 * Generic website scraper using Puppeteer for JS-rendered sites.
 * Extracts all audio/video sources, track listings, and transcript content.
 * Handles pagination to collect ALL tracks from multi-page listings.
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

    // Set a realistic viewport and user agent
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Intercept network requests to capture audio/video URLs
    const networkAudioUrls = [];
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceUrl = request.url();
      const resourceType = request.resourceType();

      // Capture audio/video network requests
      if (resourceType === 'media' || isMediaUrl(resourceUrl)) {
        networkAudioUrls.push(resourceUrl);
      }

      // Block ads and trackers for faster loading
      if (resourceType === 'image' || resourceUrl.includes('googlesyndication') ||
          resourceUrl.includes('googletagmanager') || resourceUrl.includes('doubleclick') ||
          resourceUrl.includes('facebook.net') || resourceUrl.includes('analytics')) {
        request.abort();
      } else {
        request.continue();
      }
    });

    console.log('  📄 Loading page...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

    // Wait a bit for dynamic content to render
    await delay(3000);

    // Get the full rendered HTML
    const html = await page.content();
    const pageTitle = await page.title();

    // Extract data from the rendered page
    const $ = cheerio.load(html);

    // Collect all audio/video sources from the DOM
    const domAudioUrls = extractMediaFromDOM($, url);

    // Combine network-intercepted and DOM-extracted audio URLs
    const allAudioUrls = [...new Set([...networkAudioUrls, ...domAudioUrls])];

    // Extract track listings (numbered lists, structured content)
    const trackListings = extractTrackListings($, url);

    // Extract page text content as transcript
    const transcript = extractTranscript($);

    // Try to find pagination and scrape all pages
    const paginationLinks = extractPaginationLinks($, url);

    let allTracks = [];

    if (trackListings.length > 0) {
      // We found structured track listings
      allTracks = trackListings;
    } else if (allAudioUrls.length > 0) {
      // We found audio URLs but no structured listing
      allTracks = allAudioUrls.map((audioUrl, i) => ({
        id: i,
        title: extractTitleFromUrl(audioUrl) || `Track ${i + 1}`,
        audioUrl,
        duration: null,
        transcript: i === 0 ? transcript : null,
      }));
    }

    // If there are pagination links, scrape remaining pages
    if (paginationLinks.length > 0) {
      console.log(`  📑 Found ${paginationLinks.length} additional pages to scrape...`);
      for (const pageUrl of paginationLinks) {
        try {
          console.log(`  📄 Scraping page: ${pageUrl}`);
          await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          await delay(2000);

          const pageHtml = await page.content();
          const $page = cheerio.load(pageHtml);

          const pageTracks = extractTrackListings($page, pageUrl);
          const pageAudioUrls = extractMediaFromDOM($page, pageUrl);
          const pageNetworkUrls = [...networkAudioUrls]; // may have new ones

          if (pageTracks.length > 0) {
            allTracks.push(...pageTracks.map((t, i) => ({
              ...t,
              id: allTracks.length + i,
            })));
          } else if (pageAudioUrls.length > 0) {
            allTracks.push(...pageAudioUrls.map((audioUrl, i) => ({
              id: allTracks.length + i,
              title: extractTitleFromUrl(audioUrl) || `Track ${allTracks.length + i + 1}`,
              audioUrl,
              duration: null,
              transcript: null,
            })));
          }
        } catch (pageErr) {
          console.error(`  ⚠️ Failed to scrape page ${pageUrl}:`, pageErr.message);
        }
      }
    }

    // Deduplicate tracks by audioUrl
    const uniqueTracks = [];
    const seenUrls = new Set();
    for (const track of allTracks) {
      if (track.audioUrl && !seenUrls.has(track.audioUrl)) {
        seenUrls.add(track.audioUrl);
        uniqueTracks.push(track);
      }
    }
    allTracks = uniqueTracks;

    // Re-index track IDs
    allTracks = allTracks.map((t, i) => ({ ...t, id: i }));

    await browser.close();

    return {
      title: cleanTitle(pageTitle) || 'Untitled Collection',
      sourceUrl: url,
      tracks: allTracks,
    };

  } catch (err) {
    if (browser) await browser.close();
    throw err;
  }
}

// ===================== Helper Functions =====================

function isMediaUrl(url) {
  const mediaExts = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.mp4', '.webm', '.m3u8'];
  return mediaExts.some(ext => url.toLowerCase().includes(ext));
}

function extractMediaFromDOM($, baseUrl) {
  const urls = [];

  // <audio> and <video> src attributes
  $('audio, video').each((_, el) => {
    const src = $(el).attr('src');
    if (src) urls.push(resolveUrl(src, baseUrl));
  });

  // <source> elements inside audio/video
  $('source').each((_, el) => {
    const src = $(el).attr('src');
    if (src) urls.push(resolveUrl(src, baseUrl));
  });

  // Links to audio files
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && isMediaUrl(href)) {
      urls.push(resolveUrl(href, baseUrl));
    }
  });

  // data-src, data-url, data-audio attributes
  $('[data-src], [data-url], [data-audio], [data-file]').each((_, el) => {
    const dataSrc = $(el).attr('data-src') || $(el).attr('data-url') || $(el).attr('data-audio') || $(el).attr('data-file');
    if (dataSrc && isMediaUrl(dataSrc)) {
      urls.push(resolveUrl(dataSrc, baseUrl));
    }
  });

  // iframes (may contain embedded players)
  $('iframe[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src && (src.includes('youtube') || src.includes('soundcloud') || src.includes('spotify'))) {
      urls.push(src);
    }
  });

  return [...new Set(urls)].filter(u => u && u.startsWith('http'));
}

function extractTrackListings($, baseUrl) {
  const tracks = [];

  // Look for common track listing patterns
  // Pattern 1: Links within list items or divs that contain audio references
  $('a[href]').each((i, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    const text = $el.text().trim();

    if (!href || !text) return;

    // Check if the link points to a page (not a direct media file)
    // and has text that looks like a track name (numbered, discourse, chapter, etc.)
    const looksLikeTrack = /^\d+[\.\)\-\s]|track|chapter|discourse|episode|part|lesson|lecture/i.test(text) ||
                           /\d+/.test(text);

    if (looksLikeTrack && text.length > 3 && text.length < 200) {
      const resolvedHref = resolveUrl(href, baseUrl);
      // If it's a media file link
      if (isMediaUrl(href)) {
        tracks.push({
          id: tracks.length,
          title: cleanTrackTitle(text),
          audioUrl: resolvedHref,
          duration: null,
          transcript: null,
        });
      }
    }
  });

  return tracks;
}

function extractTranscript($) {
  // Remove scripts, styles, nav, header, footer, ads
  $('script, style, nav, header, footer, .ad, .ads, .advertisement, [class*="sidebar"], [class*="comment"], [id*="comment"]').remove();

  // Try to find the main content area
  const mainSelectors = ['article', 'main', '.content', '.post-content', '.entry-content', '#content', '.article-body', '.discourse-text', '.transcript'];
  let text = '';

  for (const selector of mainSelectors) {
    const el = $(selector);
    if (el.length > 0) {
      text = el.text().trim();
      if (text.length > 100) break;
    }
  }

  // Fallback to body text
  if (text.length < 100) {
    text = $('body').text().trim();
  }

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  return text.length > 50 ? text : null;
}

function extractPaginationLinks($, baseUrl) {
  const links = [];
  const seen = new Set();

  // Common pagination patterns
  const paginationSelectors = [
    '.pagination a',
    '.pager a',
    '.page-numbers a',
    'nav.pagination a',
    '.wp-pagenavi a',
    'a.page-link',
    '[class*="pagination"] a',
    '[class*="paging"] a',
    'a[href*="page="]',
    'a[href*="page/"]',
    'a[href*="pg="]',
    '.next a',
    'a.next',
    'a[rel="next"]',
  ];

  for (const selector of paginationSelectors) {
    $(selector).each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const resolved = resolveUrl(href, baseUrl);
        if (!seen.has(resolved) && resolved !== baseUrl) {
          seen.add(resolved);
          links.push(resolved);
        }
      }
    });
  }

  return links;
}

function resolveUrl(url, baseUrl) {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

function cleanTitle(title) {
  if (!title) return '';
  return title
    .replace(/\s*[-|–]\s*(osho\s*world|home|page).*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTrackTitle(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^\d+[\.\)\-\s]+/, (match) => match) // keep numbering
    .trim();
}

function extractTitleFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const filename = decodeURIComponent(pathname.split('/').pop() || '');
    return filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim() || null;
  } catch {
    return null;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { scrapeGeneric };
