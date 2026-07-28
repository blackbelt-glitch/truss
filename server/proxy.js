const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const upload = multer({ dest: '/tmp/truss-uploads/' });
const PORT = 3456;

// API key from server .env - never exposed to the app
const WHISPER_KEY = process.env.TRUSS_WHISPER_KEY || '';

if (!WHISPER_KEY) {
  console.error('ERROR: TRUSS_WHISPER_KEY not set. Create a .env file with:');
  console.error('  TRUSS_WHISPER_KEY=sk-or-v1-your-key');
  console.error('Or set it in the environment.');
  process.exit(1);
}

app.post('/transcribe', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  const filePath = req.file.path;
  const fileStream = fs.createReadStream(filePath);

  // Build multipart form data for OpenAI Whisper API
  const boundary = '----TrussBoundary' + Date.now();
  let body = '';
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="model"\r\n\r\n`;
  body += `whisper-1\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="response_format"\r\n\r\n`;
  body += `json\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="language"\r\n\r\n`;
  body += `en\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n`;
  body += `Content-Type: audio/wav\r\n\r\n`;

  const bodyBuffer = Buffer.from(body, 'utf-8');
  const footer = `\r\n--${boundary}--\r\n`;
  const footerBuffer = Buffer.from(footer, 'utf-8');
  const fileBuffer = fs.readFileSync(filePath);
  const totalLength = bodyBuffer.length + fileBuffer.length + footerBuffer.length;

  const options = {
    hostname: 'api.openai.com',
    port: 443,
    path: '/v1/audio/transcriptions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHISPER_KEY}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': totalLength,
    },
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', (chunk) => data += chunk);
    apiRes.on('end', () => {
      fs.unlink(filePath, () => {});
      try {
        const parsed = JSON.parse(data);
        if (apiRes.statusCode !== 200) {
          return res.status(apiRes.statusCode).json(parsed);
        }
        res.json({ text: parsed.text || '' });
      } catch {
        res.status(500).json({ error: 'Failed to parse Whisper response' });
      }
    });
  });

  apiReq.on('error', (e) => {
    fs.unlink(filePath, () => {});
    res.status(500).json({ error: e.message });
  });

  apiReq.write(bodyBuffer);
  const readStream = fs.createReadStream(filePath);
  readStream.pipe(apiReq, { end: false });
  readStream.on('end', () => apiReq.end(footerBuffer));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Truss Whisper proxy running on http://localhost:${PORT}`);
  console.log('POST /transcribe with audio file → returns { text: "..." }');
});