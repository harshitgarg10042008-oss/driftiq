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
const crypto = require('crypto');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2000 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ── DATA FILES ──
const USERS_DB = './data/users.json';
const FILES_DB = './data/files.json';
const FOLDERS_DB = './data/folders.json';
const SHARES_DB = './data/shares.json';

function readDB(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeDB(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Initialize database
function initDB() {
  const users = readDB(USERS_DB);
  
  // Create harshit admin if doesn't exist
  if (!users.find(u => u.username === 'harshit')) {
    const hash = bcrypt.hashSync('driftiq123', 10);
    users.push({ 
      id: 1, 
      username: 'harshit', 
      password: hash,
      isAdmin: true,
      createdAt: new Date().toISOString()
    });
    console.log('✅ Admin user created: harshit / driftiq123');
  }
  
  // Create admin account if doesn't exist
  if (!users.find(u => u.username === 'admin')) {
    const hash = bcrypt.hashSync('admin123', 10);
    users.push({ 
      id: 999, 
      username: 'admin', 
      password: hash,
      isAdmin: true,
      createdAt: new Date().toISOString()
    });
    console.log('✅ Admin user created: admin / admin123');
  }
  
  writeDB(USERS_DB, users);
  
  // Ensure other files exist
  if (!fs.existsSync(FILES_DB)) writeDB(FILES_DB, []);
  if (!fs.existsSync(FOLDERS_DB)) writeDB(FOLDERS_DB, []);
  if (!fs.existsSync(SHARES_DB)) writeDB(SHARES_DB, []);
}
initDB();

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

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    const users = readDB(USERS_DB);
    const user = users.find(u => u.id === req.user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

// ── AUTH ROUTES ──
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  const users = readDB(USERS_DB);
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const newUser = {
    id: Date.now(),
    username,
    password: hash,
    isAdmin: false,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  writeDB(USERS_DB, users);
  const token = jwt.sign({ id: newUser.id, username: newUser.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, username: newUser.username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = readDB(USERS_DB);
  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username, isAdmin: user.isAdmin || false });
});

// ── FOLDER ROUTES ──
app.get('/api/folders', authMiddleware, (req, res) => {
  const folders = readDB(FOLDERS_DB);
  const userFolders = folders.filter(f => f.userId === req.user.id);
  res.json(userFolders);
});

app.post('/api/folders', authMiddleware, (req, res) => {
  const { name, parentFolderId } = req.body;
  if (!name) return res.status(400).json({ error: 'Folder name required' });
  const folders = readDB(FOLDERS_DB);
  const newFolder = {
    id: Date.now().toString(),
    userId: req.user.id,
    name,
    parentFolderId: parentFolderId || null,
    createdAt: new Date().toISOString()
  };
  folders.push(newFolder);
  writeDB(FOLDERS_DB, folders);
  res.json(newFolder);
});

app.delete('/api/folders/:id', authMiddleware, (req, res) => {
  const folders = readDB(FOLDERS_DB);
  const folder = folders.find(f => f.id === req.params.id);
  if (!folder || folder.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const filtered = folders.filter(f => f.id !== req.params.id && f.parentFolderId !== req.params.id);
  writeDB(FOLDERS_DB, filtered);
  res.json({ success: true });
});

// ── FILE ROUTES ──
app.get('/api/files', authMiddleware, (req, res) => {
  const files = readDB(FILES_DB);
  const userFiles = files.filter(f => f.userId === req.user.id).reverse();
  res.json(userFiles);
});

app.post('/api/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file' });

    const { folderId } = req.body;
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
      userId: req.user.id,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      fileId,
      messageId: msg.message_id,
      folderId: folderId || null,
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
    const files = readDB(FILES_DB);
    const file = files.find(f => f.fileId === req.params.fileId);
    if (!file || file.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
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
  const file = files.find(f => f.id === req.params.id);
  if (!file || file.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const filtered = files.filter(f => f.id !== req.params.id);
  writeDB(FILES_DB, filtered);
  res.json({ success: true });
});

// ── FILE SHARING ROUTES ──
app.post('/api/shares', authMiddleware, (req, res) => {
  const { fileId } = req.body;
  const files = readDB(FILES_DB);
  const file = files.find(f => f.id === fileId);
  if (!file || file.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const shares = readDB(SHARES_DB);
  const token = crypto.randomBytes(16).toString('hex');
  const shareRecord = {
    id: Date.now().toString(),
    fileId,
    userId: req.user.id,
    token,
    createdAt: new Date().toISOString()
  };
  shares.push(shareRecord);
  writeDB(SHARES_DB, shares);
  res.json({ shareUrl: `/share/${token}`, token });
});

app.get('/api/shares/:token', async (req, res) => {
  try {
    const shares = readDB(SHARES_DB);
    const share = shares.find(s => s.token === req.params.token);
    if (!share) return res.status(404).json({ error: 'Share not found' });
    
    const files = readDB(FILES_DB);
    const file = files.find(f => f.id === share.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });
    
    const response = await axios.get(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${file.fileId}`
    );
    if (!response.data.ok) throw new Error('File not found');
    const filePath = response.data.result.file_path;
    const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
    res.json({ file: { name: file.name, size: file.size }, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN ROUTES ──
app.get('/api/admin/users', adminMiddleware, (req, res) => {
  const users = readDB(USERS_DB);
  res.json(users.map(u => ({ id: u.id, username: u.username, isAdmin: u.isAdmin, createdAt: u.createdAt })));
});

app.delete('/api/admin/users/:id', adminMiddleware, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete own account' });
  }
  const users = readDB(USERS_DB);
  const filtered = users.filter(u => u.id !== parseInt(req.params.id));
  writeDB(USERS_DB, filtered);
  
  // Delete user's files
  const files = readDB(FILES_DB);
  writeDB(FILES_DB, files.filter(f => f.userId !== parseInt(req.params.id)));
  
  res.json({ success: true });
});

app.get('/api/admin/files', adminMiddleware, (req, res) => {
  const files = readDB(FILES_DB).reverse();
  res.json(files);
});

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(1) + ' GB';
}

// ── STATIC SHARE PAGE ──
app.get('/share/:token', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>DriftIQ - Download File</title>
    <style>
    :root {--bg: #08080f; --s1: #0f0f1a; --accent: #7c6bff; --text: #eeeeff; --muted: #6b6b8f; --border: #2a2a42;}
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;}
    .share-box{background:var(--s1);border:1px solid var(--border);border-radius:20px;padding:40px;max-width:450px;text-align:center;}
    .share-logo{font-size:2.5rem;margin-bottom:20px;}
    h1{font-size:1.5rem;margin-bottom:10px;}
    p{color:var(--muted);margin-bottom:20px;}
    .file-info{background:rgba(124,107,255,0.1);border:1px solid var(--border);border-radius:12px;padding:20px;margin:20px 0;text-align:left;}
    .file-name{font-weight:bold;word-break:break-all;}
    .file-size{color:var(--muted);font-size:0.9rem;margin-top:5px;}
    .dl-btn{background:linear-gradient(135deg,var(--accent),#9b8fff);color:white;border:none;padding:14px 28px;border-radius:10px;font-weight:bold;cursor:pointer;font-size:1rem;width:100%;transition:all 0.2s;}
    .dl-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(124,107,255,0.4);}
    .dl-btn:disabled{opacity:0.5;cursor:not-allowed;}
    .loading{display:none;color:var(--muted);}
    .error{display:none;color:#ff6b9d;}
    </style></head><body>
    <div class="share-box">
      <div class="share-logo">📥</div>
      <h1>Download Shared File</h1>
      <p>This file has been shared with you</p>
      <div class="loading" id="loading">⏳ Loading file info...</div>
      <div class="error" id="error"></div>
      <div class="file-info" id="fileInfo" style="display:none;">
        <div class="file-name" id="fileName"></div>
        <div class="file-size" id="fileSize"></div>
      </div>
      <button class="dl-btn" id="dlBtn" onclick="downloadFile()" style="display:none;">⬇ Download File</button>
    </div>
    <script>
      const token = '${req.params.token}';
      let fileUrl = '';
      async function loadFile() {
        document.getElementById('loading').style.display = 'block';
        try {
          const r = await fetch(\`/api/shares/\${token}\`);
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          fileUrl = d.url;
          document.getElementById('fileName').textContent = d.file.name;
          document.getElementById('fileSize').textContent = 'Size: ' + formatSize(d.file.size);
          document.getElementById('fileInfo').style.display = 'block';
          document.getElementById('dlBtn').style.display = 'block';
        } catch(e) {
          document.getElementById('error').textContent = '❌ ' + e.message;
          document.getElementById('error').style.display = 'block';
        }
        document.getElementById('loading').style.display = 'none';
      }
      function downloadFile() {
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = document.getElementById('fileName').textContent;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      function formatSize(b) {
        if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';
        if(b<1073741824)return(b/1048576).toFixed(1)+' MB';return(b/1073741824).toFixed(1)+' GB';
      }
      loadFile();
    </script></body></html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 DriftIQ running on port ${PORT}`));
