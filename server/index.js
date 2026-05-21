const express    = require("express");
const cors       = require("cors");
const bodyParser = require("body-parser");
const path       = require("path");
const fs         = require("fs");
const http       = require("http");
const WebSocketServer = require("ws").Server;

const app  = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors({ origin: "*", credentials: true }));
app.use(bodyParser.json({ limit: "15mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "15mb" }));
app.use("/uploads", express.static(UPLOADS_DIR));

require("./database");

app.use("/api/auth",          require("./routes/auth").router);
app.use("/api/upload",        require("./routes/upload"));
app.use("/api/leads",         require("./routes/leads"));
app.use("/api/deals",         require("./routes/deals"));
app.use("/api/contacts",      require("./routes/contacts"));
app.use("/api/companies",     require("./routes/companies"));
app.use("/api/activities",    require("./routes/activities"));
app.use("/api/analytics",     require("./routes/analytics"));
app.use("/api/products",      require("./routes/products"));
app.use("/api/invoices",      require("./routes/invoices"));
app.use("/api/quotes",        require("./routes/quotes"));
app.use("/api/tasks",         require("./routes/tasks"));
app.use("/api/users",         require("./routes/users"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/chat",          require("./routes/chat"));
app.use("/api/reports",       require("./routes/reports"));
app.use("/api/timeman",       require("./routes/timeman"));
app.use("/api/projects",      require("./routes/projects"));
app.use("/api/control-panel", require("./routes/control-panel"));
app.use("/api/mail/rules",    require("./routes/mail-rules"));
app.use("/api/mail/labels",   require("./routes/mail-labels"));
app.use("/api/mail",          require("./routes/mail-accounts"));
app.use("/api/hr",            require("./routes/hr"));
app.use("/api/devops",        require("./routes/devops"));
app.use("/api/automation",    require("./routes/automation"));
app.use("/api/stream",            require("./routes/stream"));
app.use("/api/workgroups",        require("./routes/workgroups"));
app.use("/api/workflows",         require("./routes/workflows"));
app.use("/api/role-permissions",  require("./routes/role-permissions"));
app.use("/api/activity-logs",     require("./routes/activity-logs"));
app.use("/api/client-limits",    require("./routes/client-limits"));
app.use("/api/webhooks",         require("./routes/webhooks"));

app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "CRM API running", timestamp: new Date().toISOString() })
);

// ── Admin: clear all mail accounts (one-time maintenance) ─────────────────
app.get("/api/admin/clear-mail-accounts", (req, res) => {
  try {
    const db = require("./database");
    const accounts = db.getCollection("mail_accounts");
    accounts.forEach(a => db.delete("mail_accounts", a.id));
    db.data["mail_accounts"] = [];
    db.save();
    res.json({ success: true, message: `Cleared all mail accounts. Reload the Mail page and connect team@outsourcedbookeeping.com` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Manual email poll trigger ──────────────────────────────────────────────
app.post("/api/mail/poll-now", async (req, res) => {
  try {
    const { runPoll } = require("./services/email-poller");
    await runPoll();
    res.json({ success: true, message: "Email poll completed" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Create HTTP server (shared by Express + WebSocket) ────────────────────
const server = http.createServer(app);

// ── WebSocket Signaling Server — same port as API (5000) ──────────────────
const wss = new WebSocketServer({ server });

const clients = new Map(); // userId → { ws, userId, userName }

const broadcast = (data) => {
  const msg = JSON.stringify(data);
  clients.forEach(c => { if (c.ws.readyState === c.ws.OPEN) c.ws.send(msg); });
};

const sendTo = (userId, data) => {
  const c = clients.get(String(userId));
  if (c && c.ws.readyState === c.ws.OPEN) { c.ws.send(JSON.stringify(data)); return true; }
  return false;
};

const getOnlineUsers = () =>
  Array.from(clients.values()).map(c => ({ userId: c.userId, userName: c.userName }));

wss.on("connection", (ws) => {
  let myUserId = null;

  ws.on("message", (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case "register":
        myUserId = String(msg.userId);
        clients.set(myUserId, { ws, userId: myUserId, userName: msg.userName || "Unknown" });
        ws.send(JSON.stringify({ type: "online-users", users: getOnlineUsers() }));
        broadcast({ type: "user-joined", userId: myUserId, userName: msg.userName });
        console.log(`[WS] ${msg.userName} registered (${myUserId}). Online: ${clients.size}`);
        break;

      case "call-offer":
        console.log(`[WS] call-offer from ${msg.from} to ${msg.to}`);
        sendTo(msg.to, { type: "call-offer", from: msg.from, fromName: msg.fromName, offer: msg.offer, callType: msg.callType || "video" });
        break;

      case "call-answer":
        console.log(`[WS] call-answer from ${msg.from} to ${msg.to}`);
        sendTo(msg.to, { type: "call-answer", from: msg.from, answer: msg.answer });
        break;

      case "ice-candidate":
        sendTo(msg.to, { type: "ice-candidate", from: msg.from, candidate: msg.candidate });
        break;

      case "call-reject":
        sendTo(msg.to, { type: "call-rejected", from: msg.from });
        break;

      case "call-end":
        sendTo(msg.to, { type: "call-ended", from: msg.from });
        break;

      case "call-busy":
        sendTo(msg.to, { type: "call-busy", from: msg.from });
        break;

      case "get-online-users":
        ws.send(JSON.stringify({ type: "online-users", users: getOnlineUsers() }));
        break;
    }
  });

  ws.on("close", () => {
    if (myUserId) {
      const name = clients.get(myUserId)?.userName;
      clients.delete(myUserId);
      broadcast({ type: "user-left", userId: myUserId });
      console.log(`[WS] ${name} disconnected. Online: ${clients.size}`);
    }
  });
});

// ── Start ─────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n✅  CRM API     →  http://localhost:${PORT}`);
  console.log(`📡  WebSocket  →  ws://localhost:${PORT}`);
  console.log(`\n   Both run on the SAME port ${PORT}\n`);

  // Ensure every existing user has a task_email_token
  try {
    require("./routes/users").ensureAllUsersHaveTokens();
  } catch (e) {
    console.error("[Users] Token migration failed:", e.message);
  }

  // Start background email-to-task polling for main inbox accounts
  try {
    require("./services/email-poller").start();
  } catch (e) {
    console.error("[Poller] Failed to start email poller:", e.message);
  }

  // ── Periodic cleanup: remove heartbeat/call_signal noise every hour ───────
  const SIGNAL_TYPES = new Set(["heartbeat", "call_signal"]);
  const cleanSignalNoise = () => {
    try {
      const db = require("./database");
      const all = db.getCollection("notifications");
      let removed = 0;
      all.forEach((n) => {
        if (SIGNAL_TYPES.has(n.type) || n.entity_type === "presence") {
          db.delete("notifications", n.id);
          removed++;
        }
      });
      if (removed > 0) console.log(`[Cleanup] Removed ${removed} signal notifications`);
    } catch (e) {
      console.error("[Cleanup] Error:", e.message);
    }
  };
  // Run once at startup to clear existing noise, then hourly
  setTimeout(cleanSignalNoise, 5000);
  setInterval(cleanSignalNoise, 60 * 60 * 1000);
});

module.exports = app;
