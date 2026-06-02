// backend/config/database.js
const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables",
  );
}

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false, // Disable session persistence in Node.js
      autoRefreshToken: false,
    },
  },
);

// Test connection on startup
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from("users").select("count");
    if (error) throw error;
    console.log("✓ Database connection successful");
    return true;
  } catch (err) {
    console.error("✗ Database connection failed:", err.message);
    return false;
  }
};

module.exports = {
  supabase,
  testConnection,
};
