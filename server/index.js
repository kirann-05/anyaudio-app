const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { initDB } = require('./db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;

// --------------- Middleware ---------------
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// --------------- API Routes ---------------
app.use('/api', apiRoutes);

// --------------- Static Frontend ---------------
// Try built dist first, fall back to raw client source files
const distPath = path.join(__dirname, '../client/dist');
const rawClientPath = path.join(__dirname, '../client');
const distExists = fs.existsSync(path.join(distPath, 'index.html'));
const publicPath = distExists ? distPath : rawClientPath;

console.log(`📁 Serving frontend from: ${publicPath} (${distExists ? 'production build' : 'raw source'})`);

app.use(express.static(publicPath));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend not found. Run npm run build to generate the client.');
    }
  }
});

// --------------- Error Handling ---------------
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --------------- Initialize & Start ---------------
(async () => {
  await initDB();
  app.listen(PORT, () => {
    console.log(`\n  🎧 AnyAudio server running on http://localhost:${PORT}\n`);
  });
})();
