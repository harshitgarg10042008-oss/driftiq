require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2000 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ── DATA FILES ──
const FILES_DB = './data/files.json';
const USERS_DB = './data/users.json';

function readDB(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeDB(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Create default admin user if not exists
function initUsers() {
  const users = readDB(USERS_DB);
  if (users.length === 0) {
    const hash = bcrypt.hashSync('driftiq123', 10);
    users.push({ id: 1, username: 'harshit', password: hash });
    writeDB(USERS_DB, users);
    console.log('✅ Default user created: harshit / driftiq123');
  }
}
initUsers();

// ── MIDDLEWARE ──
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── AUTH ROUTES ──
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = readDB(USERS_DB);
  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

// ── FILE ROUTES ──
app.get('/api/files', authMiddleware, (req, res) => {
  const files = readDB(FILES_DB);
  res.json(files.reverse());
});

app.post('/api/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file' });

    const formData = new FormData();
    formData.append('chat_id', process.env.CHANNEL_ID);
    formData.append('document', file.buffer, { filename: file.originalname, contentType: file.mimetype });
    formData.append('caption', `📁 ${file.originalname}\n📦 ${formatSize(file.size)}\n👤 ${req.user.username}`);

    const response = await axios.post(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendDocument`,
      formData,
      { headers: formData.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity }
    );

    if (!response.data.ok) throw new Error(response.data.description);

    const msg = response.data.result;
    const fileId = msg.document?.file_id || msg.video?.file_id || msg.audio?.file_id;

    const fileRecord = {
      id: Date.now().toString(),
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      fileId,
      messageId: msg.message_id,
      uploadedBy: req.user.username,
      date: new Date().toISOString()
    };

    const files = readDB(FILES_DB);
    files.push(fileRecord);
    writeDB(FILES_DB, files);

    res.json({ success: true, file: fileRecord });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/download/:fileId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${req.params.fileId}`
    );
    if (!response.data.ok) throw new Error('File not found');
    const filePath = response.data.result.file_path;
    const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/files/:id', authMiddleware, (req, res) => {
  const files = readDB(FILES_DB);
  const filtered = files.filter(f => f.id !== req.params.id);
  writeDB(FILES_DB, filtered);
  res.json({ success: true });
});

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(1) + ' GB';
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 DriftIQ running on port ${PORT}`));
