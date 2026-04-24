const axios = require('axios');

/**
 * Pro Artwork Engine
 * Fetches official high-res covers from iTunes Metadata API
 */
async function getOfficialArt(query) {
  try {
    // Clean up query: remove common suffixes that confuse iTunes
    const cleanQuery = query
      .replace(/\(Official Video\)/gi, '')
      .replace(/\[Official Video\]/gi, '')
      .replace(/\(Lyric Video\)/gi, '')
      .replace(/\[Lyric Video\]/gi, '')
      .replace(/ft\..*$/gi, '')
      .replace(/feat\..*$/gi, '')
      .replace(/&.*$/gi, '')
      .trim();

    console.log(`  🎵 Searching iTunes for: "${cleanQuery}"`);
    
    const response = await axios.get('https://itunes.apple.com/search', {
      params: {
        term: cleanQuery,
        media: 'music',
        limit: 1,
        entity: 'song'
      },
      timeout: 5000
    });

    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      // Get the highest resolution possible (1000x1000)
      return result.artworkUrl100.replace('100x100bb', '1000x1000bb');
    }

    return null;
  } catch (err) {
    console.error('  ❌ iTunes search failed:', err.message);
    return null;
  }
}

module.exports = { getOfficialArt };
