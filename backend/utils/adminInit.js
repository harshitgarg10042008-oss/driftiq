// backend/utils/adminInit.js
const { supabase } = require("../config/database");
const bcrypt = require("bcryptjs");
const logger = require("./logger");

const checkAndCreateAdmin = async () => {
  try {
    const { data: admins, error: adminErr } = await supabase
      .from("users")
      .select("id")
      .eq("role", "admin");

    if (adminErr) {
      logger.error("Error checking for admin user: " + adminErr.message);
      return;
    }

    if (!admins || admins.length === 0) {
      console.log("No admin user found. Creating default admin...");
      
      const email = process.env.ADMIN_EMAIL || "admin@driftiq.com";
      const username = process.env.ADMIN_USERNAME || "admin";
      const password = process.env.ADMIN_PASSWORD || "AdminPassword123!";
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      
      const { data: newUser, error: insertErr } = await supabase
        .from("users")
        .insert([
          {
            email,
            username,
            password_hash,
            full_name: "System Administrator",
            role: "admin",
            telegram_status: "disconnected"
          }
        ])
        .select()
        .single();
        
      if (insertErr) {
        logger.error("Failed to auto-create admin user: " + insertErr.message);
      } else {
        console.log(`✓ Admin user auto-created. Username: ${username}, Email: ${email}`);
        logger.info(`✓ Admin user auto-created. Username: ${username}, Email: ${email}`);
        
        // Also create storage stats entry for admin
        await supabase
          .from("storage_stats")
          .insert([{ user_id: newUser.id, total_files: 0, total_size: 0 }]);
      }
    } else {
      console.log("✓ Admin user verification successful (at least one admin exists).");
    }
  } catch (err) {
    logger.error("Error in admin auto-creation check: " + err.message);
  }
};

module.exports = { checkAndCreateAdmin };
