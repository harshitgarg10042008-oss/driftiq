require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

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
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}

/* ───────── REGISTER ───────── */

app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const userId = uuidv4();

    const { error } = await supabase.from("users").insert([
      {
        id: userId,
        username,
        password: hashed,
        role: "user",
        telegramconnected: false,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) return res.status(400).json({ error: error.message });

    const token = jwt.sign(
      { id: userId, username, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, username, role: "user" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ───────── LOGIN ───────── */

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username);

    const user = data?.[0];

    if (error || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = bcrypt.compareSync(password, user.password);

    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ───────── TELEGRAM STATUS ENDPOINTS (FIXED) ───────── */

// Frontend checks this endpoint to toggle the "Connect with Telegram" workspace layout
app.get("/api/user/telegram-status", auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("telegramconnected, telegramchatid")
      .eq("id", req.user.id)
      .single();

    if (error || !data) {
      return res.json({ telegramconnected: false });
    }

    res.json({
      telegramconnected: data.telegramconnected || false,
      telegramchatid: data.telegramchatid || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ───────── FILE MANAGEMENT ROUTES ───────── */

app.get("/api/files", auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("user_id", req.user.id);

    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const fileMetadata = {
      id: uuidv4(),
      user_id: req.user.id,
      name: req.file.originalname,
      size: req.file.size,
      mime_type: req.file.mimetype,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("files")
      .insert([fileMetadata])
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, file: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ───────── ADMIN USERS ───────── */

app.get("/api/admin/users", auth, adminOnly, async (req, res) => {
  const { data, error } = await supabase.from("users").select("*");

  if (error) return res.status(500).json({ error: error.message });

  const safeUsers = data.map((u) => {
    delete u.password;
    return u;
  });

  res.json(safeUsers);
});

/* ───────── SERVER ───────── */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});