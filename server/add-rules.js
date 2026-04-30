/* eslint-disable */
/**
 * Run this ONCE from your server folder to add all email routing rules:
 *   node add-rules.js
 *
 * It calls your running CRM server on localhost:5000.
 * Safe to run while the server is running — does not touch files directly.
 */

const http = require("http");

const BASE = "http://localhost:5000";

// ── Helpers ─────────────────────────────────────────────────────────────────
function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: "localhost",
      port: 5000,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ raw }); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── All 45 routing rules ─────────────────────────────────────────────────────
const RULES = [
  // HARVINDER SINGH
  { condition_type: "domain",     condition_value: "butlercommunities.com",      assign_to: "Harvinder Singh", description: "Butler Communities LLC" },
  { condition_type: "domain",     condition_value: "chungroupcpa.com",            assign_to: "Harvinder Singh", description: "Chun Group CPA" },
  { condition_type: "from_email", condition_value: "bookkeeping@dcgtaxsolutions.com", assign_to: "Harvinder Singh", description: "DCG Tax and Accounting" },
  { condition_type: "from_email", condition_value: "dcgtaxsolutions@gmail.com",       assign_to: "Harvinder Singh", description: "DCG Tax and Accounting" },
  { condition_type: "from_email", condition_value: "damian.gaitan@dcgtaxsolutions.com", assign_to: "Harvinder Singh", description: "DCG Tax and Accounting" },
  { condition_type: "from_email", condition_value: "murillo.mike@outlook.com",    assign_to: "Harvinder Singh", description: "JCS Estate Holdings" },
  { condition_type: "domain",     condition_value: "prominencebusiness.com",       assign_to: "Harvinder Singh", description: "Prominence Business" },
  { condition_type: "domain",     condition_value: "wcpg.ca",                      assign_to: "Harvinder Singh", description: "West Canadian Properties" },
  { condition_type: "from_email", condition_value: "lwong@wcpg.ca",                assign_to: "Harvinder Singh", description: "West Canadian Properties" },
  { condition_type: "domain",     condition_value: "theklotzcompanies.com",        assign_to: "Harvinder Singh", description: "The Klotz Group of Companies" },
  { condition_type: "from_email", condition_value: "outsourcedbookeeping@theklotzcompanies.com", assign_to: "Harvinder Singh", description: "The Klotz Group" },
  { condition_type: "domain",     condition_value: "turnkeypmg.com",               assign_to: "Harvinder Singh", description: "CRT Ventures LLC" },
  { condition_type: "from_email", condition_value: "johnbeldensr@gmail.com",        assign_to: "Harvinder Singh", description: "CRT Ventures LLC" },
  { condition_type: "from_email", condition_value: "alex@memphisturnkey.com",       assign_to: "Harvinder Singh", description: "CRT Ventures LLC" },
  { condition_type: "domain",     condition_value: "tupeloww.com",                 assign_to: "Harvinder Singh", description: "M and C Window LLC" },

  // HARSIMRAN SINGH
  { condition_type: "domain",     condition_value: "sylvanhs.com",                 assign_to: "Harsimran Singh", description: "Sylvan Homes LLC" },
  { condition_type: "domain",     condition_value: "sylvanroad.com",               assign_to: "Harsimran Singh", description: "Sylvan Homes LLC" },

  // MOHINDER SINGH
  { condition_type: "domain",     condition_value: "valezar.com",                  assign_to: "Mohinder Singh", description: "Valezar & Associates" },
  { condition_type: "from_email", condition_value: "valezar@aol.com",              assign_to: "Mohinder Singh", description: "Valezar & Associates" },
  { condition_type: "from_email", condition_value: "carlos@valezar.com",           assign_to: "Mohinder Singh", description: "Valezar & Associates" },
  { condition_type: "domain",     condition_value: "wealthtrainingacademy.com",    assign_to: "Mohinder Singh", description: "Tax Advisory Group" },
  { condition_type: "from_email", condition_value: "abosiack@wealthtrainingacademy.com", assign_to: "Mohinder Singh", description: "Tax Advisory Group" },
  { condition_type: "from_email", condition_value: "payroll@wealthtrainingacademy.com",  assign_to: "Mohinder Singh", description: "Tax Advisory Group" },
  { condition_type: "domain",     condition_value: "outsourcedbookeeping.net",     assign_to: "Mohinder Singh", description: "Tax Advisory Group (net forwarder)" },

  // RAJESH KUMAR GUPTA
  { condition_type: "domain",     condition_value: "balcpa.com",                   assign_to: "Rajesh Kumar Gupta", description: "BSC Accounting / BalCpa" },
  { condition_type: "domain",     condition_value: "bscaccountingservices.com",    assign_to: "Rajesh Kumar Gupta", description: "BSC Accounting Services" },
  { condition_type: "domain",     condition_value: "perrotin.com",                 assign_to: "Rajesh Kumar Gupta", description: "BSC / Perrotin" },
  { condition_type: "from_email", condition_value: "terricheema@hotmail.com",      assign_to: "Rajesh Kumar Gupta", description: "BalCpa - Terri Cheema" },
  { condition_type: "from_email", condition_value: "terri.balcpa@hotmail.com",     assign_to: "Rajesh Kumar Gupta", description: "BalCpa - Terri Cheema" },
  { condition_type: "from_email", condition_value: "delfierrobrian@gmail.com",     assign_to: "Rajesh Kumar Gupta", description: "BalCpa" },
  { condition_type: "from_email", condition_value: "tlcheema@gmail.com",           assign_to: "Rajesh Kumar Gupta", description: "BalCpa - Terri Cheema" },
  { condition_type: "from_email", condition_value: "sunil@balcpa.com",             assign_to: "Rajesh Kumar Gupta", description: "BSC Accounting" },
  { condition_type: "domain",     condition_value: "thejohnlgroup.com",            assign_to: "Rajesh Kumar Gupta", description: "The John L Group" },
  { condition_type: "from_email", condition_value: "douglasfirmllc@gmail.com",     assign_to: "Rajesh Kumar Gupta", description: "Douglas Firm LLC" },
  { condition_type: "from_email", condition_value: "guillermo94@hernandeztaxoffice.com", assign_to: "Rajesh Kumar Gupta", description: "Hernandez Tax Service" },
  { condition_type: "domain",     condition_value: "hernandeztaxoffice.com",       assign_to: "Rajesh Kumar Gupta", description: "Hernandez Tax Service" },
  { condition_type: "domain",     condition_value: "legacyfinancialpartnersllc.com", assign_to: "Rajesh Kumar Gupta", description: "Legacy Financial Partners" },

  // ARVIND KUMAR
  { condition_type: "domain",     condition_value: "envegan.com",                  assign_to: "Arvind Kumar", description: "Envegan LLC" },
  { condition_type: "from_email", condition_value: "sunil.contractor@envegan.com", assign_to: "Arvind Kumar", description: "Envegan LLC" },
  { condition_type: "domain",     condition_value: "ginomorena.com",               assign_to: "Arvind Kumar", description: "Gino Morena Enterprises" },
  { condition_type: "from_email", condition_value: "outsource@ginomorena.com",     assign_to: "Arvind Kumar", description: "Gino Morena Enterprises" },
  { condition_type: "from_email", condition_value: "pennyn@ginomorena.com",        assign_to: "Arvind Kumar", description: "Gino Morena Enterprises - Penny" },
  { condition_type: "from_email", condition_value: "services@onboardpm.com",       assign_to: "Arvind Kumar", description: "OnBoard Property Management" },
  { condition_type: "from_email", condition_value: "onboardpropertymanagement@gmail.com", assign_to: "Arvind Kumar", description: "OnBoard Property Management" },
  { condition_type: "from_email", condition_value: "kerryspelman@redlandsrealestate.com", assign_to: "Arvind Kumar", description: "PropMan Inc - Kerry Spelman" },
];

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔐 Logging in...");

  // Try multiple admin accounts
  let token = null;
  const logins = [
    { email: "admin@outsourcedbookeeping.com", password: "Admin@123" },
    { email: "sunil@outsourcedbookeeping.com", password: "Admin@123" },
    { email: "amit@outsourcedbookeeping.com",  password: "Admin@123" },
  ];

  for (const creds of logins) {
    try {
      const res = await request("POST", "/api/auth/login", creds);
      if (res.token) { token = res.token; console.log(`✅ Logged in as ${creds.email}`); break; }
    } catch {}
  }

  if (!token) {
    // Try to find any user from the users list
    console.log("⚠️  Could not log in with default credentials.");
    console.log("   Please edit this script and update the email/password in the 'logins' array above.");
    process.exit(1);
  }

  // Check existing rules
  const existing = await request("GET", "/api/mail/rules", null, token);
  const existingRules = existing.data || [];
  console.log(`\nExisting rules: ${existingRules.length}`);

  if (existingRules.length >= 40) {
    console.log("✅ Rules already populated! Nothing to do.");
    return;
  }

  // Clear any existing rules first (to avoid duplicates)
  if (existingRules.length > 0) {
    console.log(`🗑️  Removing ${existingRules.length} existing rules...`);
    for (const r of existingRules) {
      await request("DELETE", `/api/mail/rules/${r.id}`, null, token);
    }
  }

  // Add all rules
  console.log(`\n📋 Adding ${RULES.length} routing rules...`);
  let added = 0;
  for (let i = 0; i < RULES.length; i++) {
    const rule = { ...RULES[i], priority: i + 1, active: true };
    const res = await request("POST", "/api/mail/rules", rule, token);
    if (res.success) {
      added++;
      process.stdout.write(`\r  Added ${added}/${RULES.length}...`);
    } else {
      console.error(`\n  ❌ Failed to add rule: ${RULES[i].condition_value}`, res.error);
    }
  }

  console.log(`\n\n✅ Done! Added ${added} rules.`);
  console.log("\nRules by assignee:");
  const byAssignee = {};
  RULES.forEach(r => { byAssignee[r.assign_to] = (byAssignee[r.assign_to] || 0) + 1; });
  Object.entries(byAssignee).forEach(([name, count]) => console.log(`  ${name}: ${count} rules`));
  console.log("\n🎯 Email routing is now active. New emails to team@outsourcedbookeeping.com");
  console.log("   will be automatically assigned to the correct team leader.");
}

main().catch(console.error);
