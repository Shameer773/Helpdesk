// One-time bootstrap: create the first admin account.
//   node --env-file=.env.local scripts/seed-admin.mjs <email> <password>
// The email should also be listed in ADMIN_EMAILS so the role is enforced.
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node --env-file=.env.local scripts/seed-admin.mjs <email> <password>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { role: "admin", full_name: "Administrator" },
});

if (error) {
  if (String(error.message).toLowerCase().includes("already")) {
    console.log(`User ${email} already exists — nothing to do.`);
    process.exit(0);
  }
  console.error("Failed:", error.message);
  process.exit(1);
}

console.log(`Created admin account: ${data.user.email} (${data.user.id})`);
