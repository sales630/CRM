const express = require("express");
const router = express.Router();
const db = require("../database");
const { authMiddleware } = require("./auth");

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

// ── Helpers ────────────────────────────────────────────────────────────────
function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  return { start, end };
}

/**
 * Calculate cost and minutes for a client from a given date onwards (unbounded end).
 * Used to compute "unbilled" work since the last billing date.
 */
function calcSinceDate(clientName, hourlyRate, sinceDate) {
  if (!sinceDate) return { cost: 0, minutes: 0 };

  const tasks = db.getCollection("tasks").filter((t) => {
    const name = (t.client_name || t.client || "").trim().toLowerCase();
    return name === clientName.trim().toLowerCase();
  });

  let totalMins = 0;
  const taskIds = new Set();
  for (const t of tasks) {
    taskIds.add(t.id);
    const refDate = (t.completed_at || t.updated_at || t.created_at || "").slice(0, 10);
    if (refDate >= sinceDate) {
      totalMins += Number(t.task_duration_minutes || 0);
    }
  }

  const timeLogs = db.getCollection("time_logs").filter((l) => {
    if (!taskIds.has(l.task_id)) return false;
    const logDate = (l.started_at || l.ended_at || "").slice(0, 10);
    return logDate >= sinceDate;
  });
  const logMins = timeLogs.reduce((s, l) => s + Number(l.duration_minutes || 0), 0);

  const effectiveMins = logMins > 0 ? logMins : totalMins;
  const cost = Math.round((effectiveMins / 60) * Number(hourlyRate) * 100) / 100;
  return { cost, minutes: effectiveMins };
}

/**
 * Calculate total cost for a client in the current month.
 * Cost = sum of task_duration_minutes on tasks with matching client_name
 *        that were updated/completed this month  ×  (hourly_rate / 60)
 *
 * Also includes time_logs entries this month for those tasks.
 */
function calcMonthCost(clientName, hourlyRate) {
  const { start, end } = currentMonthRange();
  const tasks = db.getCollection("tasks").filter((t) => {
    const name = (t.client_name || t.client || "").trim().toLowerCase();
    return name === clientName.trim().toLowerCase();
  });

  // Sum task_duration_minutes on tasks active this month
  let totalMins = 0;
  const taskIds = new Set();
  for (const t of tasks) {
    taskIds.add(t.id);
    // Count any task that was worked on (updated_at or completed_at this month)
    const refDate = (t.completed_at || t.updated_at || t.created_at || "").slice(0, 10);
    if (refDate >= start && refDate <= end) {
      totalMins += Number(t.task_duration_minutes || 0);
    }
  }

  // Also sum time_logs for these task IDs this month
  const timeLogs = db.getCollection("time_logs").filter((l) => {
    if (!taskIds.has(l.task_id)) return false;
    const logDate = (l.started_at || l.ended_at || "").slice(0, 10);
    return logDate >= start && logDate <= end;
  });
  const logMins = timeLogs.reduce((s, l) => s + Number(l.duration_minutes || 0), 0);

  // Use time_logs if available, otherwise fall back to task_duration_minutes
  const effectiveMins = logMins > 0 ? logMins : totalMins;
  const cost = Math.round((effectiveMins / 60) * Number(hourlyRate) * 100) / 100;
  return { cost, minutes: effectiveMins, taskCount: tasks.length };
}

/**
 * Find team leaders who have tasks for this client this month.
 */
function findTeamLeaders(clientName) {
  const { start, end } = currentMonthRange();
  const tasks = db.getCollection("tasks").filter((t) => {
    const name = (t.client_name || t.client || "").trim().toLowerCase();
    if (name !== clientName.trim().toLowerCase()) return false;
    const refDate = (t.updated_at || t.created_at || "").slice(0, 10);
    return refDate >= start && refDate <= end;
  });

  const leaders = new Set();
  for (const t of tasks) {
    // assigned_by is typically the team leader who created the task
    if (t.assigned_by) leaders.add(t.assigned_by);
  }
  return [...leaders];
}

/**
 * Fire notifications for a limit breach.
 */
function fireNotifications(limit, cost) {
  const month = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const overBy = (cost - limit.monthly_limit).toFixed(2);
  const msg = `⚠️ ${limit.client_name} has exceeded their $${Number(limit.monthly_limit).toLocaleString()} monthly limit — $${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} billed in ${month} ($${overBy} over)`;

  // Check if notification already fired this month (avoid duplicates)
  const { start } = currentMonthRange();
  const existing = db.getCollection("notifications").find(
    (n) =>
      n.type === "client_limit_breach" &&
      n.entity_id === limit.id &&
      (n.created_at || "").slice(0, 10) >= start
  );
  if (existing) return; // already notified this month

  // Notify all admins
  const adminUsers = db.getCollection("users").filter((u) =>
    ADMIN_ROLES.has(u.role)
  );
  for (const admin of adminUsers) {
    db.insert("notifications", {
      type:        "client_limit_breach",
      message:     msg,
      title:       "Client Budget Exceeded",
      entity_type: "client_limit",
      entity_id:   limit.id,
      user:        admin.name,
      target:      admin.name,
      read:        false,
    });
  }

  // Notify relevant team leaders
  const leaders = findTeamLeaders(limit.client_name);
  for (const leaderName of leaders) {
    // Avoid duplicate if team leader is also admin
    if (adminUsers.some((u) => u.name === leaderName)) continue;
    db.insert("notifications", {
      type:        "client_limit_breach",
      message:     msg,
      title:       "Client Budget Exceeded",
      entity_type: "client_limit",
      entity_id:   limit.id,
      user:        leaderName,
      target:      leaderName,
      read:        false,
    });
  }
}

// ── GET /  — list all limits + discovered task clients with current month cost ──
router.get("/", authMiddleware, (req, res) => {
  try {
    const limits = db.getCollection("client_limits");
    const limitNames = new Set(limits.map((l) => l.client_name.trim().toLowerCase()));

    // Enrich tracked (limit-configured) clients
    const enriched = limits.map((l) => {
      const { cost, minutes, taskCount } = calcMonthCost(l.client_name, l.hourly_rate || 0);

      // Unbilled: hours/cost since last_billed_date (or full month if never billed)
      const lastBilledDate   = l.last_billed_date || null;
      const { cost: unbilledCost, minutes: unbilledMins } =
        lastBilledDate
          ? calcSinceDate(l.client_name, l.hourly_rate || 0, lastBilledDate)
          : { cost, minutes };   // never billed → entire month is unbilled

      const creditLimit          = Number(l.credit_limit || 0);
      const creditLimitExceeded  = creditLimit > 0 && unbilledCost > creditLimit;

      return {
        ...l,
        current_cost:          cost,
        current_minutes:       minutes,
        task_count:            taskCount,
        is_over:               Number(l.monthly_limit) > 0 && cost > Number(l.monthly_limit),
        usage_pct:             l.monthly_limit > 0 ? Math.min(Math.round((cost / l.monthly_limit) * 100), 999) : 0,
        // new billing fields (computed)
        unbilled_amount:       unbilledCost,
        unbilled_minutes:      unbilledMins,
        credit_limit_exceeded: creditLimitExceeded,
        _tracked: true,
      };
    });

    // Discover clients from tasks that don't have a limit record yet
    const tasks = db.getCollection("tasks");
    const seen = new Set();
    const discovered = [];
    for (const t of tasks) {
      const name = (t.client_name || t.client || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (limitNames.has(key) || seen.has(key)) continue;
      seen.add(key);
      const { cost, minutes, taskCount } = calcMonthCost(name, 0);
      discovered.push({
        id: null,
        client_name: name,
        monthly_limit: null,
        hourly_rate: 0,
        current_cost: cost,
        current_minutes: minutes,
        task_count: taskCount,
        is_over: false,
        usage_pct: 0,
        _tracked: false,
        _discovered: true,
      });
    }

    discovered.sort((a, b) => a.client_name.localeCompare(b.client_name));
    res.json({ success: true, data: [...enriched, ...discovered] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /  — create a limit ───────────────────────────────────────────────
router.post("/", authMiddleware, (req, res) => {
  try {
    if (!ADMIN_ROLES.has(req.user?.role))
      return res.status(403).json({ success: false, error: "Admins only" });

    const {
      client_name, monthly_limit, hourly_rate = 0,
      credit_limit = 0, last_billed_date = null,
      last_billed_amount = 0, last_bill_cleared = false,
    } = req.body;
    if (!client_name || monthly_limit === undefined)
      return res.status(400).json({ success: false, error: "client_name and monthly_limit required" });

    // Prevent duplicates
    const dup = db.getCollection("client_limits").find(
      (l) => l.client_name.toLowerCase() === client_name.toLowerCase()
    );
    if (dup)
      return res.status(409).json({ success: false, error: "Limit already exists for this client" });

    const record = db.insert("client_limits", {
      client_name,
      monthly_limit:      Number(monthly_limit),
      hourly_rate:        Number(hourly_rate),
      credit_limit:       Number(credit_limit),
      last_billed_date:   last_billed_date || null,
      last_billed_amount: Number(last_billed_amount),
      last_bill_cleared:  Boolean(last_bill_cleared),
    });
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /:id  — update a limit ─────────────────────────────────────────────
router.put("/:id", authMiddleware, (req, res) => {
  try {
    if (!ADMIN_ROLES.has(req.user?.role))
      return res.status(403).json({ success: false, error: "Admins only" });

    const {
      monthly_limit, hourly_rate, client_name,
      credit_limit, last_billed_date, last_billed_amount, last_bill_cleared,
    } = req.body;
    const updates = {};
    if (monthly_limit      !== undefined) updates.monthly_limit      = Number(monthly_limit);
    if (hourly_rate        !== undefined) updates.hourly_rate        = Number(hourly_rate);
    if (client_name        !== undefined) updates.client_name        = client_name;
    if (credit_limit       !== undefined) updates.credit_limit       = Number(credit_limit);
    if (last_billed_date   !== undefined) updates.last_billed_date   = last_billed_date || null;
    if (last_billed_amount !== undefined) updates.last_billed_amount = Number(last_billed_amount);
    if (last_bill_cleared  !== undefined) updates.last_bill_cleared  = Boolean(last_bill_cleared);

    const updated = db.update("client_limits", req.params.id, updates);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────────────
router.delete("/:id", authMiddleware, (req, res) => {
  try {
    if (!ADMIN_ROLES.has(req.user?.role))
      return res.status(403).json({ success: false, error: "Admins only" });
    db.delete("client_limits", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /check  — run limit checks & fire notifications ──────────────────
router.post("/check", authMiddleware, (req, res) => {
  try {
    if (!ADMIN_ROLES.has(req.user?.role))
      return res.status(403).json({ success: false, error: "Admins only" });

    const limits = db.getCollection("client_limits");
    const results = [];

    for (const limit of limits) {
      const { cost, minutes } = calcMonthCost(limit.client_name, limit.hourly_rate || 0);
      const isOver = cost > Number(limit.monthly_limit);
      if (isOver) {
        fireNotifications(limit, cost);
      }
      results.push({
        client_name:    limit.client_name,
        monthly_limit:  limit.monthly_limit,
        current_cost:   cost,
        current_minutes: minutes,
        is_over:        isOver,
      });
    }

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /clients  — list distinct client names from tasks ─────────────────
router.get("/clients", authMiddleware, (req, res) => {
  try {
    const tasks = db.getCollection("tasks");
    const seen = new Set();
    const clients = [];
    for (const t of tasks) {
      const name = (t.client_name || t.client || "").trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        clients.push(name);
      }
    }
    clients.sort();
    res.json({ success: true, data: clients });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /label-clients  — get client names from team@outsourcedbookeeping.com labels ──
// Returns labels from that specific mail account as client names.
// Works whether the account is connected or not (gracefully returns empty if not found).
router.get("/label-clients", authMiddleware, (req, res) => {
  try {
    const TARGET_EMAIL = "team@outsourcedbookeeping.com";

    // Find the account (check all accounts, not just the caller's)
    const account = db.getCollection("mail_accounts").find(
      (a) => (a.email || "").toLowerCase() === TARGET_EMAIL.toLowerCase()
    );

    if (!account) {
      return res.json({
        success: true,
        data: { account: null, labels: [], clients: [] },
        message: `Mail account ${TARGET_EMAIL} is not connected yet. Connect it in the Mail module to auto-populate clients.`,
      });
    }

    // Get all labels for this account
    const labels = db
      .getCollection("mail_labels")
      .filter((l) => l.account_id === account.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    // Top-level labels (no parent_id) are typically the client folders
    const topLevel = labels.filter((l) => !l.parent_id);

    const clients = topLevel.map((l) => ({
      name:        l.name,
      label_id:    l.id,
      color:       l.color || "#1976d2",
      description: l.description || "",
      imap_folder: l.imap_folder || l.name,
    }));

    res.json({
      success: true,
      data: {
        account: { id: account.id, email: account.email },
        labels: topLevel,
        clients,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /sync-from-labels  — bulk-import label clients as limit records ──
// Creates a placeholder limit (monthly_limit: 0) for any label client that
// doesn't already have a limit. Admin can then edit each one to fill in values.
router.post("/sync-from-labels", authMiddleware, (req, res) => {
  try {
    if (!ADMIN_ROLES.has(req.user?.role))
      return res.status(403).json({ success: false, error: "Admins only" });

    const TARGET_EMAIL = "team@outsourcedbookeeping.com";
    const account = db.getCollection("mail_accounts").find(
      (a) => (a.email || "").toLowerCase() === TARGET_EMAIL.toLowerCase()
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        error: `Mail account ${TARGET_EMAIL} not found. Please connect it in the Mail module first.`,
      });
    }

    const labels = db
      .getCollection("mail_labels")
      .filter((l) => l.account_id === account.id && !l.parent_id);

    const existing = db.getCollection("client_limits");
    const existingNames = new Set(existing.map((l) => l.client_name.toLowerCase()));

    let created = 0;
    const newClients = [];

    for (const label of labels) {
      const name = (label.name || "").trim();
      if (!name || existingNames.has(name.toLowerCase())) continue;

      const { monthly_limit = 0, hourly_rate = 0 } = req.body; // defaults from request
      db.insert("client_limits", {
        client_name:   name,
        monthly_limit: Number(monthly_limit),
        hourly_rate:   Number(hourly_rate),
        label_id:      label.id,
        label_color:   label.color || "#1976d2",
        source:        "mail_label",
      });
      created++;
      newClients.push(name);
    }

    res.json({
      success: true,
      data: { created, clients: newClients },
      message: created > 0
        ? `Imported ${created} client(s) from mail labels. Set their limits to activate monitoring.`
        : "All label clients are already in the system.",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
