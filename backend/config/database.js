// backend/config/database.js
const { createClient } = require("@supabase/supabase-js");
const dns = require("dns");

// Set default DNS resolution to IPv4 first to avoid broken IPv6 resolution on cloud platforms like Render
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

let supabaseUrl = (process.env.SUPABASE_URL || "").trim();
let supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
let supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || "").trim();

// Remove accidental enclosing quotes if present in environment
[supabaseUrl, supabaseServiceRoleKey, supabaseAnonKey] = [
  supabaseUrl,
  supabaseServiceRoleKey,
  supabaseAnonKey,
].map((val) => {
  if (val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1);
  if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
  return val;
});

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL in environment variables");
}

// Prefer service role key for backend (bypasses RLS)
// Fall back to anon key if service role key is not set
const keyToUse = supabaseServiceRoleKey || supabaseAnonKey;
if (!keyToUse) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in environment variables"
  );
}

if (supabaseServiceRoleKey) {
  console.log("✓ Using Supabase service role key (RLS bypassed for backend)");
} else {
  console.warn(
    "⚠️ No SUPABASE_SERVICE_ROLE_KEY found. Using anon key — RLS policies may block operations."
  );
}

// Create Supabase client using service role key (full admin access, no RLS)
const supabase = createClient(supabaseUrl, keyToUse, {
  auth: {
    persistSession: false, // Disable session persistence in Node.js
    autoRefreshToken: false,
  },
});

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
