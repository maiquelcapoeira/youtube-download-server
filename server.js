// YouTube Download Server using ytdl-core (pure JavaScript, no yt-dlp needed)
const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const TEMP_DIR = path.join(os.tmpdir(), 'music-downloads');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'YouTube Download Server Running (ytdl-core)',
    endpoints: {
      health: '/health',
      download: 'POST /download with {url: "youtube_url"}'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.post('/download', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log('Download request:', url);

  try {
    const info = await ytdl.getInfo(url);
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    
    if (audioFormats.length === 0) {
      return res.status(500).json({ error: 'No audio formats available' });
    }

    const bestAudio = audioFormats[0];
    const timestamp = Date.now();
    const filename = `song_${timestamp}.mp3`;
    const filepath = path.join(TEMP_DIR, filename);

    console.log('Downloading:', info.videoDetails.title);

    const writeStream = fs.createWriteStream(filepath);
    
    ytdl(url, { format: bestAudio })
      .pipe(writeStream)
      .on('finish', () => {
        console.log('Download complete, sending file');
        
        res.download(filepath, filename, (err) => {
          if (err) {
            console.error('Send error:', err);
          }
          // Clean up
          setTimeout(() => {
            try {
              if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                console.log('Cleaned up:', filepath);
              }
            } catch (e) {
              console.error('Cleanup error:', e);
            }
          }, 30000);
        });
      })
      .on('error', (error) => {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed', details: error.message });
      });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process video', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🎵 YouTube Download Server (ytdl-core)`);
  console.log(`📡 Running on port ${PORT}`);
  console.log(`🌍 Ready to serve requests\n`);
});
