import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing Supabase connectivity...");
  const { data, error } = await client.from('users').select('*').limit(1);
  if (error) {
    console.error("SELECT ERROR:", error);
  } else {
    console.log("SELECT SUCCESS:", data);
  }

  console.log("Testing Insert...");
  const newUser = {
    email: 'test_insert_' + Date.now() + '@example.com',
    username: 'test_user_' + Date.now(),
    password_hash: 'hash',
    full_name: 'Test',
    role: 'user',
    is_active: true,
  };

  const { data: insertData, error: insertError } = await client.from('users').insert(newUser).select().single();
  if (insertError) {
    console.error("INSERT ERROR:", insertError);
  } else {
    console.log("INSERT SUCCESS:", insertData);
  }
}

test();
