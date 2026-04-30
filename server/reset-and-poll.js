/**
 * reset-and-poll.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Run this ONCE from your server folder while the main server is STOPPED:
 *
 *   node reset-and-poll.js
 *
 * What it does:
 *   1. Clears ALL existing tasks
 *   2. Clears all processed-email UIDs (so emails get re-processed)
 *   3. Polls every connected mail account for UNSEEN emails from clients
 *   4. Creates tasks for each client email found today
 */

const db = require("./database");
const { runPoll } = require("./services/email-poller");

async function main() {
  console.log("\n========================================");
  console.log(" STEP 1: Clear all existing tasks");
  console.log("========================================");
  const tasks = db.getCollection("tasks");
  console.log(`Found ${tasks.length} tasks — deleting...`);
  for (const t of tasks) {
    db.delete("tasks", t.id);
  }
  console.log("✅ All tasks cleared\n");

  console.log("========================================");
  console.log(" STEP 2: Clear processed email UIDs");
  console.log("========================================");
  const uids = db.getCollection("mail_processed_uids");
  console.log(`Found ${uids.length} processed UIDs — clearing...`);
  for (const u of uids) {
    db.delete("mail_processed_uids", u.id);
  }
  console.log("✅ Processed UIDs cleared\n");

  console.log("========================================");
  console.log(" STEP 3: Poll inbox for client emails");
  console.log("========================================");
  const accounts = db.getCollection("mail_accounts");
  if (accounts.length === 0) {
    console.log("⚠️  No mail accounts found in database.");
    console.log("    Please connect a mail account in Mail → Settings first.");
    return;
  }
  console.log(`Found ${accounts.length} mail account(s):`);
  accounts.forEach(a => console.log(`  - ${a.email} (main inbox: ${a.is_main_inbox})`));
  console.log("\nStarting poll — this may take 30–60 seconds...\n");

  // Mark ALL accounts as main inbox for this run so they get polled
  const mainAccounts = accounts.filter(a => a.is_main_inbox);
  if (mainAccounts.length === 0) {
    console.log("⚠️  No accounts are marked as 'main inbox'.");
    console.log("    Go to Mail → your account → enable 'Main Inbox'.");
    return;
  }

  await runPoll();

  const newTasks = db.getCollection("tasks");
  console.log("\n========================================");
  console.log(` ✅ DONE — ${newTasks.length} task(s) created from client emails`);
  console.log("========================================");
  newTasks.forEach(t => {
    console.log(`  [${t.task_number}] ${t.title.substring(0, 70)}`);
    console.log(`       → Assigned to: ${t.assigned_to}`);
  });
  console.log("\nRestart your server now: node index.js\n");
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
