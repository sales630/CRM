/* eslint-disable */
const express = require("express");
const router  = express.Router();
const db      = require("../database");
const { authMiddleware } = require("./auth");

// ── Default permissions per role ───────────────────────────────────────────
const DEFAULTS = {
  team_leader: [
    "dashboard","tasks","mail","calendar","messenger","timeman",
    "work-reports","workgroups","crm-activities","admin-logs",
  ],
  employee: [
    "dashboard","tasks","calendar","messenger","timeman",
  ],
};

function getOrCreate(role) {
  const all = db.getCollection("role_permissions");
  let rec = all.find(r => r.role === role);
  if (!rec) {
    rec = db.insert("role_permissions", { role, modules: DEFAULTS[role] || [] });
  }
  return rec;
}

// GET /api/role-permissions  — returns all roles
router.get("/", authMiddleware, (req, res) => {
  try {
    const tl = getOrCreate("team_leader");
    const emp = getOrCreate("employee");
    res.json({ success: true, data: { team_leader: tl.modules, employee: emp.modules } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/role-permissions/:role  — save module list for a role
router.put("/:role", authMiddleware, (req, res) => {
  try {
    const { role } = req.params;
    if (!["team_leader", "employee"].includes(role))
      return res.status(400).json({ success: false, error: "Invalid role" });
    const { modules } = req.body;
    const all = db.getCollection("role_permissions");
    let rec = all.find(r => r.role === role);
    if (rec) {
      db.update("role_permissions", rec.id, { modules: modules || [] });
    } else {
      db.insert("role_permissions", { role, modules: modules || [] });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
