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
// Try Docker public path first, then built dist, then raw client source files
const dockerPublicPath = path.join(__dirname, 'public');
const distPath = path.join(__dirname, '../client/dist');
const rawClientPath = path.join(__dirname, '../client');

let publicPath = rawClientPath;
if (fs.existsSync(dockerPublicPath) && fs.existsSync(path.join(dockerPublicPath, 'index.html'))) {
  publicPath = dockerPublicPath;
} else if (fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'))) {
  publicPath = distPath;
}

const isProduction = publicPath !== rawClientPath;

console.log(`📁 Serving frontend from: ${publicPath} (${isProduction ? 'production build' : 'raw source'})`);

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
