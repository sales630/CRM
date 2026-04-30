/* eslint-disable */
const express = require("express");
const router = express.Router();
const os = require("os");
const db = require("../database");
const { authMiddleware, requireRole } = require("./auth");

// ── Performance Stats ──────────────────────────────────────────────────────
router.get("/performance", authMiddleware, (req, res) => {
  try {
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const uptime = process.uptime();

    // DB Stats
    const allCollections = [
      "leads","deals","contacts","companies","activities","tasks","invoices",
      "quotes","products","users","chat_rooms","chat_messages","notifications",
      "work_reports","timeman_records","absence_records","work_schedules"
    ];
    const dbStats = {};
    let totalRecords = 0;
    allCollections.forEach(c => {
      const count = db.getCollection(c).length;
      dbStats[c] = count;
      totalRecords += count;
    });

    // CPU load
    const cpuLoad = os.loadavg();

    res.json({
      success: true,
      data: {
        server: {
          node_version: process.version,
          platform: os.platform(),
          arch: os.arch(),
          hostname: os.hostname(),
          uptime_seconds: Math.floor(uptime),
          uptime_formatted: formatUptime(uptime),
        },
        memory: {
          total_mb: Math.round(totalMem / 1024 / 1024),
          used_mb: Math.round(usedMem / 1024 / 1024),
          free_mb: Math.round(freeMem / 1024 / 1024),
          usage_percent: Math.round((usedMem / totalMem) * 100),
          heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
          rss_mb: Math.round(mem.rss / 1024 / 1024),
        },
        cpu: {
          cores: os.cpus().length,
          model: os.cpus()[0]?.model || "Unknown",
          load_1m: cpuLoad[0].toFixed(2),
          load_5m: cpuLoad[1].toFixed(2),
          load_15m: cpuLoad[2].toFixed(2),
        },
        database: {
          total_records: totalRecords,
          collections: dbStats,
          db_type: "JSON File DB",
        },
        process: {
          pid: process.pid,
          env: process.env.NODE_ENV || "development",
          port: process.env.PORT || 5000,
        }
      }
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

// ── System Settings ────────────────────────────────────────────────────────
router.get("/settings", authMiddleware, (req, res) => {
  try {
    let settings = db.getCollection("system_settings");
    if (!settings || settings.length === 0) {
      // Return defaults
      const defaults = getDefaultSettings();
      res.json({ success: true, data: defaults });
    } else {
      res.json({ success: true, data: settings[0] });
    }
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.put("/settings", authMiddleware, (req, res) => {
  try {
    let settings = db.getCollection("system_settings");
    if (!settings || settings.length === 0) {
      const created = db.insert("system_settings", { ...getDefaultSettings(), ...req.body });
      res.json({ success: true, data: created });
    } else {
      const updated = db.update("system_settings", settings[0].id, req.body);
      res.json({ success: true, data: updated });
    }
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

function getDefaultSettings() {
  return {
    // General
    site_name: "Back Office CRM",
    site_description: "CRM & Team Management System",
    maintenance_mode: false,
    allow_registration: false,
    // Email
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_user: "",
    smtp_from_name: "Back Office CRM",
    smtp_from_email: "noreply@backoffice.com",
    email_notifications: true,
    // Security
    session_timeout_minutes: 480,
    max_login_attempts: 5,
    password_min_length: 8,
    require_strong_password: true,
    two_factor_auth: false,
    // Localization
    default_language: "en",
    timezone: "Asia/Kolkata",
    date_format: "DD/MM/YYYY",
    time_format: "12h",
    currency: "INR",
    currency_symbol: "₹",
    number_format: "1,00,000.00",
    // Modules
    modules_enabled: {
      crm: true, tasks: true, timeman: true, messenger: true,
      mail: true, calendar: true, reports: true, workflows: true,
      workgroups: true, stream: true, invoices: true, quotes: true,
    },
    // Cache
    cache_enabled: true,
    cache_ttl_seconds: 300,
    // Notifications
    push_notifications: true,
    email_on_task_assign: true,
    email_on_deal_update: false,
  };
}

// ── Login History / Audit Log ──────────────────────────────────────────────
router.get("/login-history", authMiddleware, (req, res) => {
  try {
    const { user_id, limit = 50 } = req.query;
    let history = db.getCollection("login_history");
    if (user_id) history = history.filter(h => h.user_id === user_id);
    history = history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, parseInt(limit));
    res.json({ success: true, data: history });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── User Groups ────────────────────────────────────────────────────────────
router.get("/user-groups", authMiddleware, (req, res) => {
  try {
    const groups = db.getCollection("user_groups");
    res.json({ success: true, data: groups });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.post("/user-groups", authMiddleware, (req, res) => {
  try {
    const { name, description, permissions, members } = req.body;
    const group = db.insert("user_groups", { name, description, permissions: permissions || [], members: members || [] });
    res.json({ success: true, data: group });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.put("/user-groups/:id", authMiddleware, (req, res) => {
  try {
    const updated = db.update("user_groups", req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.delete("/user-groups/:id", authMiddleware, (req, res) => {
  try {
    db.delete("user_groups", req.params.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── Active Sessions ────────────────────────────────────────────────────────
router.get("/sessions", authMiddleware, (req, res) => {
  try {
    const sessions = db.getCollection("active_sessions");
    res.json({ success: true, data: sessions });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.delete("/sessions/:id", authMiddleware, (req, res) => {
  try {
    db.delete("active_sessions", req.params.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── Clear Cache ────────────────────────────────────────────────────────────
router.post("/clear-cache", authMiddleware, (req, res) => {
  try {
    // In a real app this would clear Redis/memory cache
    res.json({ success: true, data: { message: "Cache cleared successfully", timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

module.exports = router;
