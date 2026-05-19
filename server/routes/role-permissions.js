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

// Default "Download Report" permission per role.
// admin / super_admin are ALWAYS allowed and are not stored.
const DOWNLOAD_DEFAULTS = {
  team_leader: true,
  employee:    false,
};

function getOrCreate(role) {
  const all = db.getCollection("role_permissions");
  let rec = all.find(r => r.role === role);
  if (!rec) {
    rec = db.insert("role_permissions", {
      role,
      modules: DEFAULTS[role] || [],
      can_download_reports: DOWNLOAD_DEFAULTS[role] ?? false,
    });
    return rec;
  }
  // Back-fill the download flag on records created before this feature existed.
  if (typeof rec.can_download_reports !== "boolean") {
    rec = db.update("role_permissions", rec.id, {
      can_download_reports: DOWNLOAD_DEFAULTS[role] ?? false,
    });
  }
  return rec;
}

// GET /api/role-permissions  — returns module list + download flag for each role
router.get("/", authMiddleware, (req, res) => {
  try {
    const tl  = getOrCreate("team_leader");
    const emp = getOrCreate("employee");
    res.json({
      success: true,
      data: {
        // Legacy shape kept intact so existing callers don't break
        team_leader: tl.modules,
        employee:    emp.modules,
        // New: download permission matrix — admins/super_admins always allowed
        download_reports: {
          admin:        true,
          super_admin:  true,
          team_leader:  !!tl.can_download_reports,
          employee:     !!emp.can_download_reports,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/role-permissions/:role  — save module list (and optional download flag)
router.put("/:role", authMiddleware, (req, res) => {
  try {
    const { role } = req.params;
    if (!["team_leader", "employee"].includes(role))
      return res.status(400).json({ success: false, error: "Invalid role" });

    const { modules, can_download_reports } = req.body;
    const updates = {};
    if (modules !== undefined) updates.modules = modules || [];
    if (typeof can_download_reports === "boolean") {
      updates.can_download_reports = can_download_reports;
    }

    const all = db.getCollection("role_permissions");
    let rec = all.find(r => r.role === role);
    if (rec) {
      db.update("role_permissions", rec.id, updates);
    } else {
      db.insert("role_permissions", {
        role,
        modules: updates.modules || DEFAULTS[role] || [],
        can_download_reports:
          typeof updates.can_download_reports === "boolean"
            ? updates.can_download_reports
            : (DOWNLOAD_DEFAULTS[role] ?? false),
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/role-permissions/:role/download  — focused endpoint for the
// new toggle in the admin UI (only flips the download flag).
router.patch("/:role/download", authMiddleware, (req, res) => {
  try {
    const { role } = req.params;
    if (!["team_leader", "employee"].includes(role))
      return res.status(400).json({ success: false, error: "Invalid role" });
    const can = !!req.body.can_download_reports;
    const rec = getOrCreate(role);
    db.update("role_permissions", rec.id, { can_download_reports: can });
    res.json({ success: true, data: { role, can_download_reports: can } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
