/* eslint-disable */
const express = require("express");
const router  = express.Router();
const db      = require("../database");
const { authMiddleware } = require("./auth");

// ── GET all labels for an account ─────────────────────────────────────────
router.get("/account/:accountId", authMiddleware, (req, res) => {
  try {
    const labels = db.getCollection("mail_labels")
      .filter(l => l.account_id === req.params.accountId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    res.json({ success: true, data: labels });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── GET all labels for all accounts belonging to current user ─────────────
router.get("/mine", authMiddleware, (req, res) => {
  try {
    const myAccounts = db.getCollection("mail_accounts")
      .filter(a => a.user_id === req.user.id)
      .map(a => a.id);
    const labels = db.getCollection("mail_labels")
      .filter(l => myAccounts.includes(l.account_id))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    res.json({ success: true, data: labels });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST create a label ────────────────────────────────────────────────────
router.post("/", authMiddleware, (req, res) => {
  try {
    const { account_id, name, parent_id, imap_folder, auto_task, assign_to, color, description } = req.body;
    if (!account_id || !name) return res.status(400).json({ success: false, error: "account_id and name required" });

    // Verify the account belongs to this user
    const account = db.getById("mail_accounts", account_id);
    if (!account || account.user_id !== req.user.id)
      return res.status(403).json({ success: false, error: "Account not found or access denied" });

    // Default IMAP folder: if parent exists, prefix with parent's imap_folder
    let folderPath = imap_folder || name;
    if (parent_id) {
      const parent = db.getById("mail_labels", parent_id);
      if (parent && !imap_folder) {
        folderPath = `${parent.imap_folder || parent.name}/${name}`;
      }
    }

    const existing = db.getCollection("mail_labels");
    const sortOrder = existing.filter(l => l.account_id === account_id && (l.parent_id || null) === (parent_id || null)).length;

    const label = db.insert("mail_labels", {
      account_id,
      name,
      parent_id:   parent_id || null,
      imap_folder: folderPath,
      auto_task:   auto_task !== false,
      assign_to:   assign_to || null,
      color:       color || "#1976d2",
      description: description || "",
      sort_order:  sortOrder,
      created_by:  req.user.name,
    });

    res.status(201).json({ success: true, data: label });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── PUT update a label ────────────────────────────────────────────────────
router.put("/:id", authMiddleware, (req, res) => {
  try {
    const label = db.getById("mail_labels", req.params.id);
    if (!label) return res.status(404).json({ success: false, error: "Label not found" });

    // Verify the account belongs to this user
    const account = db.getById("mail_accounts", label.account_id);
    if (!account || account.user_id !== req.user.id)
      return res.status(403).json({ success: false, error: "Access denied" });

    const { name, parent_id, imap_folder, auto_task, assign_to, color, description } = req.body;
    const updates = {};
    if (name        !== undefined) updates.name        = name;
    if (parent_id   !== undefined) updates.parent_id   = parent_id || null;
    if (imap_folder !== undefined) updates.imap_folder = imap_folder;
    if (auto_task   !== undefined) updates.auto_task   = auto_task;
    if (assign_to   !== undefined) updates.assign_to   = assign_to || null;
    if (color       !== undefined) updates.color       = color;
    if (description !== undefined) updates.description = description;

    const updated = db.update("mail_labels", req.params.id, updates);
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── DELETE a label ────────────────────────────────────────────────────────
router.delete("/:id", authMiddleware, (req, res) => {
  try {
    const label = db.getById("mail_labels", req.params.id);
    if (!label) return res.status(404).json({ success: false, error: "Label not found" });

    const account = db.getById("mail_accounts", label.account_id);
    if (!account || account.user_id !== req.user.id)
      return res.status(403).json({ success: false, error: "Access denied" });

    // Delete children too
    db.getCollection("mail_labels")
      .filter(l => l.parent_id === req.params.id)
      .forEach(child => db.delete("mail_labels", child.id));

    db.delete("mail_labels", req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST reorder labels ───────────────────────────────────────────────────
router.post("/reorder", authMiddleware, (req, res) => {
  try {
    const { ids } = req.body; // ordered array of label ids
    if (!Array.isArray(ids)) return res.status(400).json({ success: false, error: "ids must be an array" });
    ids.forEach((id, idx) => {
      try { db.update("mail_labels", id, { sort_order: idx }); } catch {}
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
