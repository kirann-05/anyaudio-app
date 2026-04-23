const express = require('express');
const router = express.Router();
const axios = require('axios');
const {
  getOrCreateUser, getUser,
  saveCollection, getCollections, getCollection, deleteCollection, markTrackDownloaded,
  saveProgress, getProgress,
  createPlaylist, getPlaylists, getPlaylist, addToPlaylist, removeFromPlaylist, deletePlaylist,
} = require('../db');
const { scrape } = require('../scraper');

// ===================== Health =====================
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===================== User =====================
router.post('/user/login', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim().length < 1) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const user = await getOrCreateUser(username.trim().toLowerCase());
    res.json(user);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const user = await getUser(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ===================== Scrape =====================
router.post('/scrape', async (req, res) => {
  try {
    const { url, userId } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const user = await getUser(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    console.log(`  🔍 Scraping: ${url}`);
    const result = await scrape(url);

    if (!result || !result.tracks || result.tracks.length === 0) {
      return res.status(422).json({ error: 'No audio tracks found at that URL' });
    }

    const collection = await saveCollection(userId, url, result.title, result.tracks);
    console.log(`  ✅ Scraped ${result.tracks.length} tracks: "${result.title}"`);
    res.json(collection);
  } catch (err) {
    console.error('Scrape error:', err);
    res.status(500).json({ error: 'Failed to scrape URL: ' + err.message });
  }
});

// ===================== Collections =====================
router.get('/user/:userId/collections', async (req, res) => {
  try {
    const collections = await getCollections(req.params.userId);
    res.json(collections);
  } catch (err) {
    console.error('Get collections error:', err);
    res.status(500).json({ error: 'Failed to get collections' });
  }
});

router.get('/collection/:id', async (req, res) => {
  try {
    const collection = await getCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    res.json(collection);
  } catch (err) {
    console.error('Get collection error:', err);
    res.status(500).json({ error: 'Failed to get collection' });
  }
});

router.delete('/collection/:id', async (req, res) => {
  try {
    await deleteCollection(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete collection error:', err);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

router.post('/track/:trackId/downloaded', async (req, res) => {
  try {
    const { localFilename } = req.body;
    await markTrackDownloaded(req.params.trackId, localFilename);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark downloaded error:', err);
    res.status(500).json({ error: 'Failed to mark track downloaded' });
  }
});

// ===================== Progress =====================
router.post('/progress', async (req, res) => {
  try {
    const { userId, collectionId, trackIndex, currentTime, completed } = req.body;
    if (!userId || !collectionId) {
      return res.status(400).json({ error: 'userId and collectionId are required' });
    }
    await saveProgress(userId, collectionId, trackIndex || 0, currentTime || 0, completed || 0);
    res.json({ success: true });
  } catch (err) {
    console.error('Save progress error:', err);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

router.get('/progress/:userId/:collectionId', async (req, res) => {
  try {
    const progress = await getProgress(req.params.userId, req.params.collectionId);
    res.json(progress || { trackIndex: 0, currentTime: 0, completed: 0 });
  } catch (err) {
    console.error('Get progress error:', err);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// ===================== Playlists =====================
router.post('/playlist', async (req, res) => {
  try {
    const { userId, name, description } = req.body;
    if (!userId || !name) return res.status(400).json({ error: 'userId and name are required' });
    const playlist = await createPlaylist(userId, name, description);
    res.json(playlist);
  } catch (err) {
    console.error('Create playlist error:', err);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

router.get('/user/:userId/playlists', async (req, res) => {
  try {
    const playlists = await getPlaylists(req.params.userId);
    res.json(playlists);
  } catch (err) {
    console.error('Get playlists error:', err);
    res.status(500).json({ error: 'Failed to get playlists' });
  }
});

router.get('/playlist/:id', async (req, res) => {
  try {
    const playlist = await getPlaylist(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (err) {
    console.error('Get playlist error:', err);
    res.status(500).json({ error: 'Failed to get playlist' });
  }
});

router.post('/playlist/:id/tracks', async (req, res) => {
  try {
    const { collectionId, trackIndices } = req.body;
    if (!collectionId || !trackIndices) {
      return res.status(400).json({ error: 'collectionId and trackIndices are required' });
    }
    await addToPlaylist(req.params.id, collectionId, trackIndices);
    res.json({ success: true });
  } catch (err) {
    console.error('Add to playlist error:', err);
    res.status(500).json({ error: 'Failed to add tracks to playlist' });
  }
});

router.delete('/playlist/:id/tracks/:trackId', async (req, res) => {
  try {
    await removeFromPlaylist(req.params.id, req.params.trackId);
    res.json({ success: true });
  } catch (err) {
    console.error('Remove from playlist error:', err);
    res.status(500).json({ error: 'Failed to remove track' });
  }
});

router.delete('/playlist/:id', async (req, res) => {
  try {
    await deletePlaylist(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete playlist error:', err);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// ===================== Stream Proxy =====================
router.get('/stream', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url query param is required' });

    let decodedUrl = decodeURIComponent(url);

    // Handle ytdlp:// scheme — resolve real stream URL on the fly
    if (decodedUrl.startsWith('ytdlp://')) {
      const videoUrl = decodedUrl.replace('ytdlp://', '');
      console.log(`  🎬 Resolving yt-dlp stream for: ${videoUrl}`);
      try {
        const { getStreamUrl } = require('../scraper/strategies/streaming');
        decodedUrl = await getStreamUrl(videoUrl);
        if (!decodedUrl) throw new Error('Resolved URL is empty');
        console.log(`  ✅ Resolved to: ${decodedUrl.substring(0, 80)}...`);
      } catch (err) {
        console.error('  ❌ yt-dlp resolve failed:', err.message);
        return res.status(502).json({ error: 'Failed to resolve stream URL: ' + err.message });
      }
    }

    if (!decodedUrl || !decodedUrl.startsWith('http')) {
      console.error('  ❌ Invalid stream URL:', decodedUrl);
      return res.status(400).json({ error: 'Invalid stream URL' });
    }

    const headers = {};
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    try { headers['Referer'] = new URL(decodedUrl).origin; } catch {}

    const response = await axios({
      method: 'get',
      url: decodedUrl,
      responseType: 'stream',
      headers,
      timeout: 30000,
    });

    const forwardHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    forwardHeaders.forEach(h => {
      if (response.headers[h]) {
        res.setHeader(h, response.headers[h]);
      }
    });

    res.status(response.status);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

    response.data.pipe(res);

    req.on('close', () => {
      response.data.destroy();
    });
  } catch (err) {
    console.error('  ❌ Stream error for', req.query.url, ':', err.message);
    if (!res.headersSent) {
      const statusCode = err.response?.status || 500;
      res.status(statusCode).json({ error: 'Failed to stream: ' + err.message });
    }
  }
});

module.exports = router;
