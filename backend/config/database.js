// backend/config/database.js
const { createClient } = require("@supabase/supabase-js");
const dns = require("dns");

// Set default DNS resolution to IPv4 first to avoid broken IPv6 resolution on cloud platforms like Render
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

let supabaseUrl = (process.env.SUPABASE_URL || "").trim();
let supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || "").trim();

// Remove accidental enclosing quotes if present in environment
if (supabaseUrl.startsWith('"') && supabaseUrl.endsWith('"')) {
  supabaseUrl = supabaseUrl.slice(1, -1);
}
if (supabaseAnonKey.startsWith('"') && supabaseAnonKey.endsWith('"')) {
  supabaseAnonKey = supabaseAnonKey.slice(1, -1);
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables",
  );
}

// Create Supabase client
const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
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
