const express = require("express");
const router = express.Router();
const db = require("../database");
const { authMiddleware } = require("./auth");

// Types used internally for WebRTC/presence signalling — never shown in the UI
const SIGNAL_TYPES = new Set(["heartbeat", "call_signal"]);
const ADMIN_ROLES = new Set(["admin", "super_admin"]);

// ── Decode raw JSON messages into human-readable strings ───────────────────
function decodeMessage(raw, type) {
  if (!raw || typeof raw !== "string") return raw || "";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return raw;

  let parsed;
  try { parsed = JSON.parse(trimmed); } catch { return raw; }

  // Heartbeat presence: { userId, userName, ts }
  if (parsed.userId && parsed.userName && parsed.ts) {
    return `${parsed.userName} is online`;
  }

  // WebRTC call signal: { signalType, from, fromName, payload }
  if (parsed.signalType) {
    const name = parsed.fromName || parsed.toName || "Someone";
    switch (parsed.signalType) {
      case "call-offer":     return `📞 Incoming call from ${name}`;
      case "call-answer":    return `📞 ${name} answered the call`;
      case "call-reject":
      case "call-rejected":  return `📞 ${name} declined the call`;
      case "call-ended":
      case "call-end":       return `📞 Call ended — ${name}`;
      case "call-busy":      return `📞 ${name} is busy right now`;
      case "ice-candidate":  return `📡 Connection established with ${name}`;
      default:               return `📞 Call event from ${name}`;
    }
  }

  // user-joined / user-left broadcast
  if (parsed.type === "user-joined") return `👤 ${parsed.userName || "A user"} came online`;
  if (parsed.type === "user-left")   return `👤 ${parsed.userName || "A user"} went offline`;

  // Generic JSON — try common message fields
  if (parsed.message) return parsed.message;
  if (parsed.text)    return parsed.text;
  if (parsed.title)   return parsed.title;
  if (parsed.body)    return parsed.body;

  // Last resort: readable key=value pairs
  return Object.entries(parsed)
    .filter(([k]) => !["id", "ts", "payload", "from", "userId", "entity_id"].includes(k))
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

// ── Infer a clean type from a decoded payload ──────────────────────────────
function resolveType(notif) {
  if (notif.type && !SIGNAL_TYPES.has(notif.type)) return notif.type;
  // Try to guess from the raw message
  try {
    const p = JSON.parse(notif.message || "{}");
    if (p.signalType?.includes("call")) return "call";
    if (p.userId && p.ts)              return "system";
  } catch {}
  return "system";
}

// ── GET /  — returns notifications for the authenticated user (admins see all) ──
router.get("/", authMiddleware, (req, res) => {
  try {
    const { read, type, limit = 100, all: showAll } = req.query;
    const callerName = req.user?.name || "";
    const callerRole = req.user?.role || "";
    const isAdmin = ADMIN_ROLES.has(callerRole);

    let notifs = db.getCollection("notifications");

    // ── Heartbeat requests: return all presence records (global, no user filter) ──
    if (type === "heartbeat") {
      notifs = notifs.filter((n) => n.type === "heartbeat");
      notifs = notifs
        .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
        .slice(0, 500)
        .map((n) => ({ ...n, message: n.message }));
      return res.json({ success: true, data: notifs, unread: 0 });
    }

    // ── Call signal requests: return signals addressed to this user ──────────
    if (type === "call_signal") {
      const callerId = String(req.user?.id || "");
      notifs = notifs.filter((n) =>
        n.type === "call_signal" &&
        (n.user === callerId || n.user === callerName || n.target === callerId || n.target === callerName)
      );
      if (read !== undefined) notifs = notifs.filter((n) => n.read === (read === "true"));
      notifs = notifs
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, Number(limit));
      return res.json({ success: true, data: notifs, unread: notifs.filter((n) => !n.read).length });
    }

    // ── Standard notifications: exclude WebRTC/heartbeat noise ───────────────
    notifs = notifs.filter((n) => !SIGNAL_TYPES.has(n.type));

    // ── Per-user scope (admins can pass ?all=1 to bypass or access logs page) ─
    if (!isAdmin || !showAll) {
      const callerId = String(req.user?.id || "");
      notifs = notifs.filter(
        (n) =>
          n.user === "all" ||
          n.user === callerName ||
          n.user === callerId ||
          n.target === callerName ||
          n.target === callerId ||
          n.assigned_to === callerName
      );
    }

    if (read !== undefined) notifs = notifs.filter((n) => n.read === (read === "true"));
    if (type) notifs = notifs.filter((n) => n.type === type);

    notifs = notifs
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, Number(limit))
      .map((n) => ({
        ...n,
        message: decodeMessage(n.message, n.type),
        type: resolveType(n),
        user: n.user || n.target || "all",
      }));

    res.json({ success: true, data: notifs, unread: notifs.filter((n) => !n.read).length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /logs — admin-only: all notifications for all users ──────────────────
router.get("/logs", authMiddleware, (req, res) => {
  try {
    if (!ADMIN_ROLES.has(req.user?.role) && req.user?.role !== "team_leader") {
      return res.status(403).json({ success: false, error: "Admins only" });
    }
    const { user, type, read, limit = 200, from, to } = req.query;
    let notifs = db.getCollection("notifications");

    // Still exclude raw signal noise
    notifs = notifs.filter((n) => !SIGNAL_TYPES.has(n.type));

    if (user) notifs = notifs.filter((n) => n.user === user || n.target === user);
    if (type) notifs = notifs.filter((n) => n.type === type);
    if (read !== undefined) notifs = notifs.filter((n) => n.read === (read === "true"));
    if (from) notifs = notifs.filter((n) => new Date(n.created_at) >= new Date(from));
    if (to)   notifs = notifs.filter((n) => new Date(n.created_at) <= new Date(to));

    notifs = notifs
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, Number(limit))
      .map((n) => ({
        ...n,
        message: decodeMessage(n.message, n.type),
        type: resolveType(n),
        user: n.user || n.target || "all",
      }));

    // Collect distinct users for filter dropdown
    const allNotifs = db.getCollection("notifications").filter((n) => !SIGNAL_TYPES.has(n.type));
    const users = [...new Set(allNotifs.map((n) => n.user || n.target || "all").filter(Boolean))].sort();

    res.json({ success: true, data: notifs, users, total: notifs.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE all old heartbeat / call_signal records (housekeeping) ─────────
router.delete("/cleanup-signals", (req, res) => {
  try {
    const all = db.getCollection("notifications");
    const cutoff = Date.now() - 60 * 60 * 1000; // older than 1 hour
    let removed = 0;
    all.forEach((n) => {
      if (SIGNAL_TYPES.has(n.type) || (n.entity_type === "presence")) {
        db.delete("notifications", n.id);
        removed++;
      }
    });
    res.json({ success: true, removed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/:id/read", authMiddleware, (req, res) => {
  try {
    const updated = db.update("notifications", req.params.id, { read: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/read-all", authMiddleware, (req, res) => {
  try {
    const callerName = req.user?.name || "";
    const isAdmin = ADMIN_ROLES.has(req.user?.role);
    const all = db.getCollection("notifications");
    all.forEach((n) => {
      // Only mark as read notifications that belong to this user (or all if admin)
      const belongs =
        isAdmin ||
        n.user === "all" ||
        n.user === callerName ||
        n.target === callerName ||
        n.assigned_to === callerName;
      if (belongs) db.update("notifications", n.id, { read: true });
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", (req, res) => {
  try {
    const { type, message, title, entity_type, entity_id, user = "all", target, read } = req.body;

    // ── Heartbeat upsert — update existing record instead of inserting a new one
    // This prevents the DB from flooding with thousands of heartbeat entries.
    if (type === "heartbeat") {
      let parsed = {};
      try { parsed = JSON.parse(message || "{}"); } catch {}
      const userId = parsed.userId || entity_id;
      if (userId) {
        const existing = db.getCollection("notifications").find(
          n => n.type === "heartbeat" && n.entity_id === String(userId)
        );
        if (existing) {
          const updated = db.update("notifications", existing.id, { message, entity_type: entity_type || "", read: false });
          return res.status(200).json({ success: true, data: updated });
        }
      }
    }

    const notif = db.insert("notifications", {
      type:        type || "system",
      message:     message || "",
      title:       title || "",
      entity_type: entity_type || "",
      entity_id:   entity_id || "",
      user:        user,
      target:      target || user,
      read:        read === true ? true : false,
    });
    res.status(201).json({ success: true, data: notif });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    db.delete("notifications", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
