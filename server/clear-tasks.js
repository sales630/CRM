/* eslint-disable */
/**
 * Clears ALL tasks from the database.
 * Run from your server folder:  node clear-tasks.js
 */
const http = require("http");

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: "localhost", port: 5000, path, method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({ raw }); } });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log("🔐 Logging in...");
  let token = null;
  const logins = [
    { email: "admin@outsourcedbookeeping.com", password: "Admin@123" },
    { email: "sunil@outsourcedbookeeping.com",  password: "Admin@123" },
    { email: "amit@outsourcedbookeeping.com",   password: "Admin@123" },
  ];
  for (const creds of logins) {
    try {
      const res = await request("POST", "/api/auth/login", creds);
      if (res.token) { token = res.token; console.log(`✅ Logged in as ${creds.email}`); break; }
    } catch {}
  }
  if (!token) {
    console.log("❌ Could not log in. Edit the logins array above with your admin email/password.");
    process.exit(1);
  }

  // Get all tasks
  const res = await request("GET", "/api/tasks", null, token);
  const tasks = res.data || res.tasks || [];
  console.log(`\nFound ${tasks.length} tasks to delete...`);

  if (tasks.length === 0) {
    console.log("✅ No tasks found — already empty.");
    return;
  }

  let deleted = 0;
  for (const task of tasks) {
    try {
      await request("DELETE", `/api/tasks/${task.id}`, null, token);
      deleted++;
      process.stdout.write(`\r  Deleted ${deleted}/${tasks.length}...`);
    } catch (e) {
      console.error(`\n  ⚠️  Could not delete task ${task.id}: ${e.message}`);
    }
  }

  console.log(`\n\n✅ Done! Deleted ${deleted} tasks.`);
  console.log("   The task list is now empty and ready for real work.");
}

main().catch(console.error);
