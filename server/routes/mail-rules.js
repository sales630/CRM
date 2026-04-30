/* eslint-disable */
const express = require("express");
const router  = express.Router();
const db      = require("../database");
const { authMiddleware } = require("./auth");

// ── GET all assignment rules (sorted by priority) ─────────────────────────
router.get("/", authMiddleware, (req, res) => {
  try {
    const rules = db.getCollection("mail_assignment_rules")
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
    res.json({ success: true, data: rules });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── POST create a new rule ─────────────────────────────────────────────────
router.post("/", authMiddleware, (req, res) => {
  try {
    const { condition_type, condition_value, assign_to, priority, active, description } = req.body;
    if (!condition_type || !condition_value || !assign_to)
      return res.json({ success: false, error: "condition_type, condition_value, and assign_to are required" });

    const allRules = db.getCollection("mail_assignment_rules");
    const maxPriority = allRules.length > 0 ? Math.max(...allRules.map(r => r.priority || 0)) : 0;

    const rule = db.insert("mail_assignment_rules", {
      condition_type,   // "from_email" | "domain" | "subject_keyword" | "default"
      condition_value,  // e.g. "john@client.com" | "client.com" | "tax" | "*"
      assign_to,        // user name (string)
      priority: priority !== undefined ? Number(priority) : maxPriority + 1,
      active:   active !== false,
      description: description || "",
      created_at: new Date().toISOString(),
    });
    res.status(201).json({ success: true, data: rule });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── PUT update a rule ──────────────────────────────────────────────────────
router.put("/:id", authMiddleware, (req, res) => {
  try {
    const updated = db.update("mail_assignment_rules", req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: "Rule not found" });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── DELETE a rule ──────────────────────────────────────────────────────────
router.delete("/:id", authMiddleware, (req, res) => {
  try {
    db.delete("mail_assignment_rules", req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── POST reorder rules (bulk priority update) ──────────────────────────────
// Body: { ids: ["id1","id2",...] }  — pass them in desired order
router.post("/reorder", authMiddleware, (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.json({ success: false, error: "ids array required" });
    ids.forEach((id, idx) => {
      try { db.update("mail_assignment_rules", id, { priority: idx + 1 }); } catch {}
    });
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

module.exports = router;
