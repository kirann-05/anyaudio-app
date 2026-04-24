const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

/**
 * Handle Osho World URLs by scraping their legacy HTML list for MP3 links.
 */
async function scrapeOshoWorld(url) {
  console.log('  📿 Osho World link detected. Launching specialist scraper...');
  
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    // Osho World is slow, use a long timeout
    console.log(`  🌐 Loading Osho World: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
    
    const html = await page.content();
    const $ = cheerio.load(html);
    
    const title = $('title').text().replace(/\| Osho World/gi, '').trim() || 'Osho Discourse';
    
    // Osho World lists often have links to .mp3 files
    const tracks = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.endsWith('.mp3')) {
        const trackTitle = $(el).text().trim() || `Discourse Part ${tracks.length + 1}`;
        tracks.push({
          id: tracks.length,
          title: trackTitle,
          audioUrl: href.startsWith('http') ? href : new URL(href, url).href,
          duration: null,
          transcript: null
        });
      }
    });

    await browser.close();

    if (tracks.length === 0) {
      throw new Error('No audio tracks found on this Osho World page.');
    }

    console.log(`  ✅ Extracted ${tracks.length} tracks from Osho World.`);

    return {
      title: title,
      sourceUrl: url,
      tracks: tracks
    };

  } catch (err) {
    if (browser) await browser.close();
    console.error('  ❌ Osho World scraper failed:', err.message);
    throw new Error('Osho World scraping failed: ' + err.message);
  }
}

module.exports = { scrapeOshoWorld };
