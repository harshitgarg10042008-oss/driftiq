require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
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

/* ───────── LOGIN ROUTE (FIXED) ───────── */

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Fetch user from Supabase 'users' table
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare provided password with the HASH in database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ───────── PROTECTED ROUTES ───────── */

app.get("/api/files", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("user_id", req.user.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

app.post("/api/upload", auth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });

  const { data, error } = await supabase
    .from("files")
    .insert([
      {
        id: uuidv4(),
        user_id: req.user.id,
        name: req.file.originalname,
        size: req.file.size,
        mime_type: req.file.mimetype,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, file: data[0] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
