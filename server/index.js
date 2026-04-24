const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
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

// --------------- Static Frontend (Production) ---------------
const publicPath = path.join(__dirname, '../client/dist');
app.use(express.static(publicPath));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(publicPath, 'index.html'));
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
