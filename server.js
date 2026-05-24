require("dotenv").config();
const fs = require("fs");
const path = require("path");

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configured Disk Storage to actually save files
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, uuidv4() + "-" + file.originalname)
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* ───────── AUTO SEED ADMIN ───────── */
setTimeout(async () => {
  const { data } = await supabase.from("users").select("*").eq("username", "admin").single();
  if (!data) {
    await supabase.from("users").insert([{
      id: uuidv4(),
      username: "admin",
      password: bcrypt.hashSync("123456789", 10),
      role: "admin",
      telegramconnected: true,
      created_at: new Date().toISOString()
    }]);
    console.log("✅ Admin account auto-created. Username: admin | Password: 123456789");
  }
}, 2000);

/* ───────── AUTH MIDDLEWARE ───────── */
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
}

/* ───────── REGISTER & LOGIN ───────── */
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing fields" });

    const hashed = bcrypt.hashSync(password, 10);
    const userId = uuidv4();

    const { error } = await supabase.from("users").insert([{
      id: userId, username, password: hashed, role: "user",
      telegramconnected: false, created_at: new Date().toISOString()
    }]);

    if (error) return res.status(400).json({ error: error.message });
    const token = jwt.sign({ id: userId, username, role: "user" }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, username, role: "user" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const { data, error } = await supabase.from("users").select("*").eq("username", username);
    const user = data?.[0];

    if (error || !user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ───────── TELEGRAM ENDPOINTS ───────── */
app.get("/api/user/telegram-status", auth, async (req, res) => {
  try {
    const { data } = await supabase.from("users").select("telegramconnected").eq("id", req.user.id).single();
    res.json({ telegramconnected: data?.telegramconnected || false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/user/telegram-connect", auth, async (req, res) => {
  try {
    await supabase.from("users").update({ telegramconnected: true }).eq("id", req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ───────── WORKSPACE (FILES & FOLDERS) ───────── */
app.get("/api/files", auth, async (req, res) => {
  try {
    const [filesReq, foldersReq] = await Promise.all([
      supabase.from("files").select("*").eq("user_id", req.user.id),
      supabase.from("folders").select("*").eq("user_id", req.user.id)
    ]);
    
    // Map snake_case to frontend expected camelCase
    const mappedFiles = (filesReq.data || []).map(f => ({ ...f, folderId: f.folder_id }));
    const mappedFolders = (foldersReq.data || []).map(f => ({ ...f, parentId: f.parent_id }));
    
    res.json({ files: mappedFiles, folders: mappedFolders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/folders", auth, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    const { error } = await supabase.from("folders").insert([{
      id: uuidv4(), user_id: req.user.id, name, parent_id: parentId || null
    }]);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/folders/:id", auth, async (req, res) => {
  await supabase.from("folders").delete().eq("id", req.params.id).eq("user_id", req.user.id);
  res.json({ success: true });
});

app.post("/api/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const folderId = req.body.folderId && req.body.folderId !== 'null' ? req.body.folderId : null;

    const fileMetadata = {
      id: uuidv4(), user_id: req.user.id, name: req.file.originalname,
      size: req.file.size, mime_type: req.file.mimetype, folder_id: folderId,
      storage_path: req.file.filename, created_at: new Date().toISOString()
    };

    const { error } = await supabase.from("files").insert([fileMetadata]);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/files/:id/download", auth, async (req, res) => {
  const { data } = await supabase.from("files").select("*").eq("id", req.params.id).eq("user_id", req.user.id).single();
  if (!data) return res.status(404).send("File not found");
  res.download(path.join(uploadDir, data.storage_path), data.name);
});

app.delete("/api/files/:id", auth, async (req, res) => {
  const { data } = await supabase.from("files").select("*").eq("id", req.params.id).eq("user_id", req.user.id).single();
  if (data) {
    try { fs.unlinkSync(path.join(uploadDir, data.storage_path)); } catch(e){}
    await supabase.from("files").delete().eq("id", req.params.id);
  }
  res.json({ success: true });
});

app.patch("/api/files/:id/rename", auth, async (req, res) => {
  await supabase.from("files").update({ name: req.body.name }).eq("id", req.params.id).eq("user_id", req.user.id);
  res.json({ success: true });
});

/* ───────── SHARING ───────── */
app.post("/api/shares", auth, async (req, res) => {
  const shareId = uuidv4();
  await supabase.from("shares").insert([{ id: shareId, file_id: req.body.fileId, user_id: req.user.id }]);
  res.json({ id: shareId });
});

app.get("/api/shared/:id", async (req, res) => {
  const { data: share } = await supabase.from("shares").select("*, files(*)").eq("id", req.params.id).single();
  if (!share || !share.files) return res.status(404).json({error: "Not found"});
  res.json({ fileName: share.files.name, size: share.files.size });
});

app.get("/api/shared/:id/download", async (req, res) => {
  const { data: share } = await supabase.from("shares").select("*, files(*)").eq("id", req.params.id).single();
  if (!share || !share.files) return res.status(404).send("Not found");
  res.download(path.join(uploadDir, share.files.storage_path), share.files.name);
});

/* ───────── ADMIN AREA ───────── */
app.get("/api/admin/users", auth, adminOnly, async (req, res) => {
  const { data, error } = await supabase.from("users").select("*");
  if (error) return res.status(500).json({ error: error.message });
  const safeUsers = data.map(u => { delete u.password; return u; });
  res.json(safeUsers);
});

app.delete("/api/admin/users/:id", auth, adminOnly, async (req, res) => {
  await supabase.from("users").delete().eq("id", req.params.id);
  res.json({ success: true });
});

/* ───────── SERVER ───────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});