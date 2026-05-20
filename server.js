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
const { v4: uuidv4 } = require('uuid');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2000 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ── DATA FILES ──
const FILES_DB = './data/files.json';
const USERS_DB = './data/users.json';
const FOLDERS_DB = './data/folders.json';
const SHARES_DB = './data/shares.json';

function readDB(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}
function writeDB(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

// Init default users
function initUsers() {
  const users = readDB(USERS_DB);
  if (!users.find(u => u.username === 'harshit')) {
    users.push({ id: uuidv4(), username: 'harshit', password: bcrypt.hashSync('driftiq123', 10), role: 'user', createdAt: new Date().toISOString() });
  }
  if (!users.find(u => u.username === 'admin')) {
    users.push({ id: uuidv4(), username: 'admin', password: bcrypt.hashSync('admin123', 10), role: 'admin', createdAt: new Date().toISOString() });
  }
  writeDB(USERS_DB, users);
  console.log('✅ Users initialized');
}
initUsers();

// ── MIDDLEWARE ──
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// ── AUTH ──
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = readDB(USERS_DB);
  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username, role: user.role });
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const users = readDB(USERS_DB);
  if (users.find(u => u.username === username)) return res.status(400).json({ error: 'Username already taken' });
  const newUser = { id: uuidv4(), username, password: bcrypt.hashSync(password, 10), role: 'user', createdAt: new Date().toISOString() };
  users.push(newUser);
  writeDB(USERS_DB, users);
  const token = jwt.sign({ id: newUser.id, username: newUser.username, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: newUser.username, role: newUser.role });
});

app.post('/api/change-password', auth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const users = readDB(USERS_DB);
  const user = users.find(u => u.id === req.user.id);
  if (!user || !bcrypt.compareSync(oldPassword, user.password)) return res.status(401).json({ error: 'Wrong current password' });
  user.password = bcrypt.hashSync(newPassword, 10);
  writeDB(USERS_DB, users);
  res.json({ success: true });
});

// ── FOLDERS ──
app.get('/api/folders', auth, (req, res) => {
  const folders = readDB(FOLDERS_DB).filter(f => f.userId === req.user.id);
  res.json(folders);
});

app.post('/api/folders', auth, (req, res) => {
  const { name, parentId } = req.body;
  if (!name) return res.status(400).json({ error: 'Folder name required' });
  const folder = { id: uuidv4(), name, parentId: parentId || null, userId: req.user.id, createdAt: new Date().toISOString() };
  const folders = readDB(FOLDERS_DB);
  folders.push(folder);
  writeDB(FOLDERS_DB, folders);
  res.json(folder);
});

app.put('/api/folders/:id', auth, (req, res) => {
  const { name } = req.body;
  const folders = readDB(FOLDERS_DB);
  const idx = folders.findIndex(f => f.id === req.params.id && f.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Folder not found' });
  folders[idx].name = name;
  writeDB(FOLDERS_DB, folders);
  res.json(folders[idx]);
});

app.delete('/api/folders/:id', auth, (req, res) => {
  let folders = readDB(FOLDERS_DB);
  let files = readDB(FILES_DB);
  folders = folders.filter(f => !(f.id === req.params.id && f.userId === req.user.id));
  files = files.map(f => f.folderId === req.params.id ? { ...f, folderId: null } : f);
  writeDB(FOLDERS_DB, folders);
  writeDB(FILES_DB, files);
  res.json({ success: true });
});

// ── FILES ──
app.get('/api/files', auth, (req, res) => {
  const { folderId } = req.query;
  let files = readDB(FILES_DB).filter(f => f.userId === req.user.id);
  if (folderId === 'null' || folderId === undefined) {
    files = files.filter(f => !f.folderId);
  } else {
    files = files.filter(f => f.folderId === folderId);
  }
  res.json(files.reverse());
});

app.post('/api/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { folderId } = req.body;
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
      id: uuidv4(),
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      fileId,
      messageId: msg.message_id,
      userId: req.user.id,
      uploadedBy: req.user.username,
      folderId: folderId || null,
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

app.put('/api/files/:id/rename', auth, (req, res) => {
  const { name } = req.body;
  const files = readDB(FILES_DB);
  const idx = files.findIndex(f => f.id === req.params.id && f.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'File not found' });
  files[idx].name = name;
  writeDB(FILES_DB, files);
  res.json(files[idx]);
});

app.put('/api/files/:id/move', auth, (req, res) => {
  const { folderId } = req.body;
  const files = readDB(FILES_DB);
  const idx = files.findIndex(f => f.id === req.params.id && f.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'File not found' });
  files[idx].folderId = folderId || null;
  writeDB(FILES_DB, files);
  res.json(files[idx]);
});

app.get('/api/download/:fileId', auth, async (req, res) => {
  try {
    const response = await axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${req.params.fileId}`);
    if (!response.data.ok) throw new Error('File not found');
    const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${response.data.result.file_path}`;
    res.json({ url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/files/:id', auth, (req, res) => {
  const files = readDB(FILES_DB);
  const filtered = files.filter(f => !(f.id === req.params.id && f.userId === req.user.id));
  writeDB(FILES_DB, filtered);
  res.json({ success: true });
});

// ── SHARE ──
app.post('/api/share/:id', auth, (req, res) => {
  const files = readDB(FILES_DB);
  const file = files.find(f => f.id === req.params.id && f.userId === req.user.id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  const shares = readDB(SHARES_DB);
  const existing = shares.find(s => s.fileId === file.id);
  if (existing) return res.json({ shareId: existing.id });
  const share = { id: uuidv4(), fileId: file.id, telegramFileId: file.fileId, fileName: file.name, createdAt: new Date().toISOString() };
  shares.push(share);
  writeDB(SHARES_DB, shares);
  res.json({ shareId: share.id });
});

app.get('/api/shared/:shareId', async (req, res) => {
  const shares = readDB(SHARES_DB);
  const share = shares.find(s => s.id === req.params.shareId);
  if (!share) return res.status(404).json({ error: 'Share not found' });
  try {
    const response = await axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${share.telegramFileId}`);
    const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${response.data.result.file_path}`;
    res.json({ url, fileName: share.fileName });
  } catch { res.status(500).json({ error: 'Could not get file' }); }
});

// Fix 3: Proxy download route — avoids CORS issues in browser
app.get('/api/shared/:shareId/download', async (req, res) => {
  const shares = readDB(SHARES_DB);
  const share = shares.find(s => s.id === req.params.shareId);
  if (!share) return res.status(404).json({ error: 'Share not found' });
  try {
    const fileInfo = await axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${share.telegramFileId}`);
    const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${fileInfo.data.result.file_path}`;
    // Stream file through our server — no CORS issues!
    const fileResponse = await axios.get(url, { responseType: 'stream' });
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(share.fileName)}"`);
    res.setHeader('Content-Type', fileResponse.headers['content-type'] || 'application/octet-stream');
    fileResponse.data.pipe(res);
  } catch (err) { res.status(500).json({ error: 'Download failed' }); }
});

// ── ADMIN ──
app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  const users = readDB(USERS_DB).map(u => ({ ...u, password: undefined }));
  const files = readDB(FILES_DB);
  const result = users.map(u => ({ ...u, fileCount: files.filter(f => f.userId === u.id).length }));
  res.json(result);
});

app.delete('/api/admin/users/:id', auth, adminOnly, (req, res) => {
  let users = readDB(USERS_DB);
  let files = readDB(FILES_DB);
  let folders = readDB(FOLDERS_DB);
  users = users.filter(u => u.id !== req.params.id);
  files = files.filter(f => f.userId !== req.params.id);
  folders = folders.filter(f => f.userId !== req.params.id);
  writeDB(USERS_DB, users);
  writeDB(FILES_DB, files);
  writeDB(FOLDERS_DB, folders);
  res.json({ success: true });
});

app.get('/api/admin/files', auth, adminOnly, (req, res) => {
  const files = readDB(FILES_DB);
  res.json(files.reverse());
});

app.delete('/api/admin/files/:id', auth, adminOnly, (req, res) => {
  const files = readDB(FILES_DB).filter(f => f.id !== req.params.id);
  writeDB(FILES_DB, files);
  res.json({ success: true });
});

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(1) + ' GB';
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 DriftIQ v2 running on port ${PORT}`));