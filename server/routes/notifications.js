const express = require("express");
const router = express.Router();
const db = require("../database");
const { authMiddleware } = require("./auth");

// Types used internally for WebRTC/presence signalling — never shown in the UI
const SIGNAL_TYPES = new Set(["heartbeat", "call_signal"]);
const ADMIN_ROLES = new Set(["admin", "super_admin"]);

// ── Role-based access scope ────────────────────────────────────────────────
// Mirrors the rule used by Time Management so notifications follow the same
// org boundary:
//   admin / super_admin → see every notification
//   team_leader         → see notifications about own dept members + own + broadcasts
//   employee / other    → see only notifications addressed to them + broadcasts
function getAccessScope(user) {
  if (!user) return { scope: "none", allowedUserIds: new Set(), allowedNames: new Set() };
  const role = user.role;
  if (ADMIN_ROLES.has(role)) {
    return { scope: "all", allowedUserIds: null, allowedNames: null };
  }
  if (role === "team_leader") {
    const users = db.getCollection("users");
    const dept = (user.department || "").trim().toLowerCase();
    const ids = new Set(
      users
        .filter((u) => (u.department || "").trim().toLowerCase() === dept)
        .map((u) => String(u.id))
    );
    const names = new Set(
      users
        .filter((u) => (u.department || "").trim().toLowerCase() === dept)
        .map((u) => u.name)
    );
    ids.add(String(user.id));
    names.add(user.name);
    return { scope: "department", allowedUserIds: ids, allowedNames: names };
  }
  return {
    scope: "self",
    allowedUserIds: new Set([String(user.id)]),
    allowedNames: new Set([user.name]),
  };
}

function notifInScope(n, scope) {
  if (scope.scope === "all") return true;

  // Look up the subject's role so we can apply the org hierarchy:
  //   admin / super_admin events  → visible ONLY to admins
  //   team_leader events          → visible to admins + same dept members (and self)
  //   employee events             → visible to admins + that dept's TLs + self
  let subjectRole = "";
  if (n.subject_user_id) {
    const u = db.getById("users", n.subject_user_id);
    if (u) subjectRole = u.role || "";
  }
  if (!subjectRole && n.subject_user_name) {
    const u = db.getCollection("users").find((u) => u.name === n.subject_user_name);
    if (u) subjectRole = u.role || "";
  }

  const subjectIsSelf =
    (n.subject_user_id && scope.allowedUserIds.has(String(n.subject_user_id))) ||
    (n.subject_user_name && scope.allowedNames.has(n.subject_user_name));

  // ── Hierarchy filter ──────────────────────────────────────────────────────
  // Team leader cannot see admin/super_admin events (unless about themselves)
  if (scope.scope === "department") {
    if (ADMIN_ROLES.has(subjectRole) && !subjectIsSelf) return false;
  }
  // Employee cannot see admin / TL events (only own)
  if (scope.scope === "self") {
    if ((ADMIN_ROLES.has(subjectRole) || subjectRole === "team_leader") && !subjectIsSelf) return false;
  }

  // Broadcast notifications are visible to everyone in scope
  if (n.user === "all" || n.target === "all") return true;
  // Subject-based fields populated by our event emitters
  if (subjectIsSelf) return true;
  // Direct addressing fields used by existing notification inserts
  const directAddrs = [n.user, n.target, n.assigned_to].filter(Boolean);
  for (const a of directAddrs) {
    if (scope.allowedUserIds.has(String(a))) return true;
    if (scope.allowedNames.has(a)) return true;
  }
  return false;
}

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

// ── GET /  — returns notifications visible to the caller's scope ──────────
router.get("/", authMiddleware, (req, res) => {
  try {
    const { read, type, limit = 100, all: showAll } = req.query;
    const callerRole = req.user?.role || "";
    const isAdmin = ADMIN_ROLES.has(callerRole);
    const scope = getAccessScope(req.user);

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
      const callerName = req.user?.name || "";
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

    // ── Role-based scope filter — admins with ?all=1 still bypass ────────────
    if (!isAdmin || !showAll) {
      notifs = notifs.filter((n) => notifInScope(n, scope));
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

    res.json({
      success: true,
      data: notifs,
      unread: notifs.filter((n) => !n.read).length,
      scope: scope.scope,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /logs — admin/TL audit view of all in-scope notifications ──────────
router.get("/logs", authMiddleware, (req, res) => {
  try {
    const callerRole = req.user?.role || "";
    if (!ADMIN_ROLES.has(callerRole) && callerRole !== "team_leader") {
      return res.status(403).json({ success: false, error: "Admins / team leaders only" });
    }
    const scope = getAccessScope(req.user);
    const { user, type, read, limit = 200, from, to } = req.query;
    let notifs = db.getCollection("notifications");

    // Still exclude raw signal noise
    notifs = notifs.filter((n) => !SIGNAL_TYPES.has(n.type));

    // Apply scope (admins see everything, TL sees own dept)
    if (scope.scope !== "all") {
      notifs = notifs.filter((n) => notifInScope(n, scope));
    }

    if (user) notifs = notifs.filter((n) => n.user === user || n.target === user || n.subject_user_name === user);
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

    // Collect distinct users for filter dropdown (within scope)
    const allInScope = db.getCollection("notifications")
      .filter((n) => !SIGNAL_TYPES.has(n.type))
      .filter((n) => scope.scope === "all" || notifInScope(n, scope));
    const users = [...new Set(
      allInScope.map((n) => n.subject_user_name || n.user || n.target || "all").filter(Boolean)
    )].sort();

    res.json({ success: true, data: notifs, users, total: notifs.length, scope: scope.scope });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE all old heartbeat / call_signal records (housekeeping) ─────────
router.delete("/cleanup-signals", (req, res) => {
  try {
    const all = db.getCollection("notifications");
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
    const scope = getAccessScope(req.user);
    const isAdmin = ADMIN_ROLES.has(req.user?.role);
    const all = db.getCollection("notifications");
    all.forEach((n) => {
      const belongs = isAdmin || notifInScope(n, scope);
      if (belongs) db.update("notifications", n.id, { read: true });
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", (req, res) => {
  try {
    const {
      type, message, title, entity_type, entity_id,
      user = "all", target, read,
      subject_user_id, subject_user_name, subject_department,
    } = req.body;

    // ── Heartbeat upsert — update existing record instead of inserting a new one
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
      subject_user_id:    subject_user_id    || "",
      subject_user_name:  subject_user_name  || "",
      subject_department: subject_department || "",
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
