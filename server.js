const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const { downloadFromInstagram } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// 🟢 Health check route
app.get('/', (req, res) => {
  res.send('✅ API is running');
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

// ✅ Single, debug-logged /download route
app.post('/download', async (req, res) => {
  console.log('📥 POST /download hit');
  const urls = req.body.urls;
  console.log('Received URLs:', urls);

  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'Invalid or missing "urls" array.' });
  }

  const results = [];
  for (let i = 0; i < urls.length; i++) {
    const result = await downloadFromInstagram(urls[i], i);
    results.push(result);
  }

  console.log('📤 Sending response...');
  res.json({ status: 'done', results });
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
