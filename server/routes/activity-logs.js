const express = require("express");
const router  = express.Router();
const db      = require("../database");
const { authMiddleware } = require("./auth");

const ADMIN_ROLES = new Set(["admin", "super_admin", "team_leader"]);

// GET /api/activity-logs  — admin/TL only, returns all user activity
router.get("/", authMiddleware, (req, res) => {
  try {
    if (!ADMIN_ROLES.has(req.user?.role))
      return res.status(403).json({ success: false, error: "Admins only" });

    const { user, role, module: mod, action, from, to, limit = 500 } = req.query;

    let logs = db.getCollection("activity_logs");

    if (user)   logs = logs.filter(l => l.user_name === user || l.user_id === user);
    if (role)   logs = logs.filter(l => l.user_role === role);
    if (mod)    logs = logs.filter(l => l.module === mod);
    if (action) logs = logs.filter(l => l.action === action);
    if (from)   logs = logs.filter(l => new Date(l.created_at) >= new Date(from));
    if (to)     logs = logs.filter(l => new Date(l.created_at) <= new Date(to + "T23:59:59"));

    logs = logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
               .slice(0, Number(limit));

    // Distinct filter values
    const allLogs  = db.getCollection("activity_logs");
    const users    = [...new Set(allLogs.map(l => l.user_name).filter(Boolean))].sort();
    const roles    = [...new Set(allLogs.map(l => l.user_role).filter(Boolean))].sort();
    const modules  = [...new Set(allLogs.map(l => l.module).filter(Boolean))].sort();
    const actions  = [...new Set(allLogs.map(l => l.action).filter(Boolean))].sort();

    res.json({ success: true, data: logs, total: logs.length, users, roles, modules, actions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/activity-logs/clear  — super_admin only
router.delete("/clear", authMiddleware, (req, res) => {
  try {
    if (req.user?.role !== "super_admin")
      return res.status(403).json({ success: false, error: "Super admin only" });
    const all = db.getCollection("activity_logs");
    all.forEach(l => db.delete("activity_logs", l.id));
    res.json({ success: true, removed: all.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
