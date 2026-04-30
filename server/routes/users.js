const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const db = require("../database");

// ── Same hash function as auth.js ──────────────────────────────────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha256").toString("hex");
  return salt + ":" + hash;
}

// ── Generate a unique 8-char hex task-email token ──────────────────────────
function generateTaskToken() {
  return crypto.randomBytes(4).toString("hex");
}

// ── Ensure every user has a task_email_token (run on startup) ─────────────
function ensureAllUsersHaveTokens() {
  const users = db.getCollection("users");
  let count = 0;
  users.forEach((u) => {
    if (!u.task_email_token) {
      db.update("users", u.id, { task_email_token: generateTaskToken() });
      count++;
    }
  });
  if (count > 0) console.log(`[Users] Auto-generated task tokens for ${count} user(s)`);
}

// ensureAllUsersHaveTokens exported at bottom

router.get("/", (req, res) => {
  try {
    const { role, department, search } = req.query;
    let users = db.getCollection("users");
    if (role) users = users.filter((u) => u.role === role);
    if (department) users = users.filter((u) => u.department === department);
    if (search) {
      const s = search.toLowerCase();
      users = users.filter(
        (u) => (u.name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s)
      );
    }
    // Never expose password hashes to the frontend
    const safeUsers = users.map(({ password_hash, ...u }) => u);
    res.json({ success: true, data: safeUsers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id", (req, res) => {
  try {
    const u = db.getById("users", req.params.id);
    if (!u) return res.status(404).json({ success: false, error: "Not found" });
    const { password_hash, ...safeUser } = u;
    res.json({ success: true, data: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "employee",
      department = "General",
      phone = "",
      avatar = "",
      status = "active",
      notes = "",
      reporting_to = "",
    } = req.body;
    if (!name || !email)
      return res.status(400).json({ success: false, error: "Name and email required" });

    // Hash password if provided, otherwise leave null (login fallback allows "password123")
    const password_hash = password && password.trim() ? hashPassword(password.trim()) : null;

    const user = db.insert("users", {
      name, email, role, department, phone, avatar, status,
      notes, reporting_to,
      password_hash,
      task_email_token: generateTaskToken(), // always auto-generated on creation
    });

    // Don't return the hash
    const { password_hash: _, ...safeUser } = user;
    res.status(201).json({ success: true, data: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:id", (req, res) => {
  try {
    const { password, password_hash, ...rest } = req.body;

    // Build the update payload
    const updates = { ...rest };

    // If a new plain-text password is being set, hash it
    if (password && password.trim()) {
      updates.password_hash = hashPassword(password.trim());
    }
    // If caller explicitly passes a pre-hashed password_hash, allow it too
    if (password_hash && !password) {
      updates.password_hash = password_hash;
    }

    const updated = db.update("users", req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, error: "Not found" });

    // Strip hash from response
    const { password_hash: _, ...safeUser } = updated;
    res.json({ success: true, data: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    db.delete("users", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Generate personal task-email token for a user ──────────────────────────
// POST /api/users/:id/task-email-token
// Only works if the user does NOT already have a token — tokens are permanent once set.
router.post("/:id/task-email-token", (req, res) => {
  try {
    const u = db.getById("users", req.params.id);
    if (!u) return res.status(404).json({ success: false, error: "User not found" });

    // LOCK: if a token already exists, never replace it
    if (u.task_email_token) {
      const { password_hash: _, ...safeUser } = u;
      return res.json({ success: true, data: safeUser, message: "Token already set — cannot be changed" });
    }

    // First-time generation only — 4 random bytes → 8 hex chars
    const token = crypto.randomBytes(4).toString("hex");

    const updated = db.update("users", req.params.id, { task_email_token: token });
    if (!updated) return res.status(404).json({ success: false, error: "Update failed" });

    const { password_hash: _, ...safeUser } = updated;
    res.json({ success: true, data: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.ensureAllUsersHaveTokens = ensureAllUsersHaveTokens;
module.exports = router;
