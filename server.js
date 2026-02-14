// YouTube Download Server for Render.com
// Free, always-on, no maintenance needed

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
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
    message: 'YouTube Download Server Running',
    endpoints: {
      health: '/health',
      download: 'POST /download with {url: "youtube_url"}'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.post('/download', (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log('Download request:', url);

  const timestamp = Date.now();
  const outputTemplate = path.join(TEMP_DIR, `song_${timestamp}.%(ext)s`);
  
  // Use yt-dlp to download
  const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputTemplate}" "${url}"`;

  exec(command, { timeout: 120000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('Download error:', stderr);
      return res.status(500).json({ 
        error: 'Download failed', 
        details: stderr.substring(0, 200) 
      });
    }

    const mp3File = path.join(TEMP_DIR, `song_${timestamp}.mp3`);
    
    if (!fs.existsSync(mp3File)) {
      return res.status(500).json({ error: 'File not found after download' });
    }

    console.log('Download complete, sending file');

    res.download(mp3File, `song_${timestamp}.mp3`, (err) => {
      if (err) {
        console.error('Send error:', err);
      }
      // Clean up after 30 seconds
      setTimeout(() => {
        try {
          if (fs.existsSync(mp3File)) {
            fs.unlinkSync(mp3File);
            console.log('Cleaned up:', mp3File);
          }
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }, 30000);
    });
  });
});

app.listen(PORT, () => {
  console.log(`\n🎵 YouTube Download Server`);
  console.log(`📡 Running on port ${PORT}`);
  console.log(`🌍 Ready to serve requests\n`);
});
