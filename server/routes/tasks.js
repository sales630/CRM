const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
const { authMiddleware } = require("./auth");
const logActivity = require("../utils/activityLogger");

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

// ── Optional auth — reads token if present but never rejects ──────────────
const { authMiddleware: _auth } = require("./auth");
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      const crypto = require("crypto");
      const JWT_SECRET = process.env.JWT_SECRET || "backoffice-crm-secret-2026-secure-key";
      const [h, b, s] = token.split(".");
      const expected = crypto.createHmac("sha256", JWT_SECRET).update(h + "." + b).digest("base64url");
      if (s === expected) {
        const payload = JSON.parse(Buffer.from(b, "base64url").toString());
        if (payload.exp > Math.floor(Date.now() / 1000)) req.user = payload;
      }
    } catch {}
  }
  next();
};

// ── Helpers ────────────────────────────────────────────────────────────────
const parseJSON = (v, fallback = []) => {
  try {
    return typeof v === "string" ? JSON.parse(v) : v || fallback;
  } catch {
    return fallback;
  }
};

// Generate next sequential task number: OB-0001, OB-0002 …
function nextTaskNumber() {
  const tasks = db.getCollection("tasks");
  // Find highest existing OB-NNNN number
  let max = 0;
  tasks.forEach((t) => {
    if (t.task_number) {
      const m = String(t.task_number).match(/OB-(\d+)/i);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  });
  return `OB-${String(max + 1).padStart(4, "0")}`;
}

// ── Stats ──────────────────────────────────────────────────────────────────
router.get("/stats", authMiddleware, (req, res) => {
  try {
    const callerRole = req.user?.role || "";
    const callerName = req.user?.name || "";
    const isAdmin = ADMIN_ROLES.has(callerRole);
    const isTeamLeader = callerRole === "team_leader";

    let tasks = db.getCollection("tasks");
    if (!isAdmin) {
      if (isTeamLeader) {
        tasks = tasks.filter((t) => t.assigned_to === callerName || t.assigned_by === callerName);
      } else {
        tasks = tasks.filter((t) => t.assigned_to === callerName);
      }
    }
    const today = new Date().toISOString().split("T")[0];
    const byStatus = {};
    const byPriority = {};
    const byAssignee = {};
    tasks.forEach((t) => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      if (t.assigned_to) byAssignee[t.assigned_to] = (byAssignee[t.assigned_to] || 0) + 1;
    });
    const overdue = tasks.filter(
      (t) => t.due_date && t.due_date < today && t.status !== "completed"
    ).length;
    const totalTimeLogged = db
      .getCollection("time_logs")
      .reduce((s, l) => s + Number(l.duration_minutes || 0), 0);
    res.json({
      success: true,
      data: {
        total: tasks.length,
        byStatus,
        byPriority,
        byAssignee,
        overdue,
        totalTimeLogged,
        completed: byStatus.completed || 0,
        pending: byStatus.pending || 0,
        inProgress: byStatus.in_progress || 0,
        recent: tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Email Rules ────────────────────────────────────────────────────────────
router.get("/email-rules", (req, res) => {
  try {
    res.json({ success: true, data: db.getCollection("email_rules") });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post("/email-rules", (req, res) => {
  try {
    const { name, condition_field, condition_value, assign_to, priority, tag, workflow_stage } =
      req.body;
    const rule = db.insert("email_rules", {
      name: name || "New Rule",
      condition_field: condition_field || "subject",
      condition_value: condition_value || "",
      assign_to: assign_to || "",
      priority: priority || "medium",
      tag: tag || "",
      workflow_stage: workflow_stage || "pending",
      active: true,
    });
    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.put("/email-rules/:id", (req, res) => {
  try {
    const updated = db.update("email_rules", req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.delete("/email-rules/:id", (req, res) => {
  try {
    db.delete("email_rules", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Convert Email to Task ──────────────────────────────────────────────────
router.post("/from-email", (req, res) => {
  try {
    const { from, subject, body, received_at } = req.body;
    // Apply rules
    const rules = db.getCollection("email_rules").filter((r) => r.active);
    let assignTo = "Govind Kaushik";
    let priority = "medium";
    let workflowStage = "pending";
    let tag = "";
    for (const rule of rules) {
      const field = rule.condition_field;
      const val = (rule.condition_value || "").toLowerCase();
      const src = (field === "from" ? from : subject || "").toLowerCase();
      if (src.includes(val)) {
        if (rule.assign_to) assignTo = rule.assign_to;
        if (rule.priority) priority = rule.priority;
        if (rule.workflow_stage) workflowStage = rule.workflow_stage;
        if (rule.tag) tag = rule.tag;
        break;
      }
    }
    const task = db.insert("tasks", {
      title: subject || "Email Task",
      description: body || "",
      type: "email_task",
      status: workflowStage,
      priority,
      assigned_to: assignTo,
      assigned_by: "System",
      due_date: null,
      start_date: new Date().toISOString().split("T")[0],
      tags: tag ? [tag] : ["email"],
      source: "email",
      email_data: JSON.stringify({ from, subject, body, received_at }),
      subtasks: "[]",
      recurring: JSON.stringify({ enabled: false }),
      time_estimate: 0,
      completed_at: null,
      workflow_stage: workflowStage,
      client: from || "",
    });
    // Notify activity
    db.insert("notifications", {
      type: "task_created",
      message: `Email task created from ${from}`,
      entity_type: "task",
      entity_id: task.id,
      user: assignTo,
      read: false,
    });
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── List Tasks ─────────────────────────────────────────────────────────────
router.get("/", authMiddleware, (req, res) => {
  try {
    const { status, priority, assigned_to, type, search, source, overdue, project_id, entity_type } = req.query;
    const callerRole = req.user?.role || "";
    const callerName = req.user?.name || "";
    const isAdmin = ADMIN_ROLES.has(callerRole);
    const isTeamLeader = callerRole === "team_leader";

    let tasks = db.getCollection("tasks");

    // ── Role-based visibility ──────────────────────────────────────────────
    if (!isAdmin) {
      if (isTeamLeader) {
        // Team leaders see tasks assigned TO them + tasks they assigned to others
        tasks = tasks.filter((t) =>
          t.assigned_to === callerName || t.assigned_by === callerName
        );
      } else {
        // Employees only see tasks assigned to them
        tasks = tasks.filter((t) => t.assigned_to === callerName);
      }
    }

    if (status) tasks = tasks.filter((t) => t.status === status);
    if (priority) tasks = tasks.filter((t) => t.priority === priority);
    if (assigned_to) tasks = tasks.filter((t) => t.assigned_to === assigned_to);
    if (type) tasks = tasks.filter((t) => t.type === type);
    if (source) tasks = tasks.filter((t) => t.source === source);
    if (project_id) tasks = tasks.filter((t) => t.project_id === project_id || t.entity_id === project_id);
    if (entity_type) tasks = tasks.filter((t) => t.entity_type === entity_type);
    if (search) {
      const s = search.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          (t.title || "").toLowerCase().includes(s) ||
          (t.description || "").toLowerCase().includes(s)
      );
    }
    if (overdue === "true") {
      const today = new Date().toISOString().split("T")[0];
      tasks = tasks.filter((t) => t.due_date && t.due_date < today && t.status !== "completed");
    }
    tasks = tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    // Enrich with time logged
    const timeLogs = db.getCollection("time_logs");
    tasks = tasks.map((t) => {
      const logs = timeLogs.filter((l) => l.task_id === t.id);
      const timeLogged = logs.reduce((s, l) => s + Number(l.duration_minutes || 0), 0);
      return {
        ...t,
        time_logged: timeLogged,
        tags: parseJSON(t.tags),
        subtasks: parseJSON(t.subtasks),
        email_data: t.email_data ? parseJSON(t.email_data, {}) : null,
        recurring: parseJSON(t.recurring, { enabled: false }),
      };
    });
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Get Task ───────────────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  try {
    const t = db.getById("tasks", req.params.id);
    if (!t) return res.status(404).json({ success: false, error: "Not found" });
    const comments = db
      .getCollection("task_comments")
      .filter((c) => c.task_id === req.params.id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const timeLogs = db
      .getCollection("time_logs")
      .filter((l) => l.task_id === req.params.id)
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    const timeLogged = timeLogs.reduce((s, l) => s + Number(l.duration_minutes || 0), 0);
    res.json({
      success: true,
      data: {
        ...t,
        tags: parseJSON(t.tags),
        subtasks: parseJSON(t.subtasks),
        email_data: t.email_data ? parseJSON(t.email_data, {}) : null,
        recurring: parseJSON(t.recurring, {}),
        comments,
        timeLogs,
        time_logged: timeLogged,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Create Task ────────────────────────────────────────────────────────────
router.post("/", optionalAuth, (req, res) => {
  try {
    const {
      title,
      description = "",
      type = "task",
      status = "pending",
      priority = "medium",
      assigned_to = "",
      assigned_by = "",
      due_date = null,
      start_date = null,
      tags = [],
      subtasks = [],
      recurring = { enabled: false },
      time_estimate = 0,
      client = "",
      workflow_stage = "pending",
      source = "manual",
      // ── New accounting fields ──────────────────────────────
      project_name      = "",
      crm_item          = "",
      crm_company       = "",
      work_performed    = "",
      is_tax_return     = false,
      tax_return_total  = "",
      is_payroll        = false,
      payroll_total     = "",
      senior_accountant = "",
      client_name       = "",
    } = req.body;
    if (!title) return res.status(400).json({ success: false, error: "Title required" });
    // Resolve assignee: use provided value, fall back to assigner, then default person
    const finalAssignedTo = assigned_to || assigned_by || "Mohinder Singh";
    const finalAssignedBy = assigned_by || assigned_to || "System";
    const task = db.insert("tasks", {
      task_number: nextTaskNumber(),
      title,
      description,
      type,
      status,
      priority,
      assigned_to: finalAssignedTo,
      assigned_by: finalAssignedBy,
      due_date,
      start_date: start_date || new Date().toISOString().split("T")[0],
      tags: JSON.stringify(Array.isArray(tags) ? tags : []),
      subtasks: JSON.stringify(Array.isArray(subtasks) ? subtasks : []),
      recurring: JSON.stringify(recurring),
      time_estimate,
      time_logged: 0,
      client: client || client_name,
      client_name: client_name || client,
      workflow_stage: status,
      source,
      completed_at: null,
      email_data: null,
      // ── New accounting fields ──────────────────────────────
      project_name,
      crm_item,
      crm_company,
      work_performed,
      is_tax_return:     Boolean(is_tax_return),
      tax_return_total:  tax_return_total || "",
      is_payroll:        Boolean(is_payroll),
      payroll_total:     payroll_total || "",
      senior_accountant,
    });
    db.insert("notifications", {
      type: "task_created",
      message: `Task "${title}" created and assigned to ${finalAssignedTo}`,
      entity_type: "task",
      entity_id: task.id,
      user: finalAssignedTo,
      read: false,
    });
    logActivity({
      userId:      req.body.created_by_id || "",
      userName:    finalAssignedBy,
      userRole:    req.body.created_by_role || "",
      action:      "create",
      module:      "task",
      entityId:    task.id,
      entityTitle: title,
      detail:      `Created task "${title}" → assigned to ${finalAssignedTo}`,
      ip:          req.ip,
    });
    res.status(201).json({
      success: true,
      data: { ...task, subtasks: parseJSON(task.subtasks), tags: parseJSON(task.tags) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Update Task ────────────────────────────────────────────────────────────
router.put("/:id", optionalAuth, (req, res) => {
  try {
    const { subtasks, recurring, tags, ...rest } = req.body;
    const updates = { ...rest };
    if (subtasks !== undefined)
      updates.subtasks = JSON.stringify(Array.isArray(subtasks) ? subtasks : []);
    if (recurring !== undefined) updates.recurring = JSON.stringify(recurring);
    if (tags !== undefined) updates.tags = JSON.stringify(Array.isArray(tags) ? tags : []);
    // Sync client / client_name
    if (updates.client_name !== undefined && !updates.client) updates.client = updates.client_name;
    if (updates.client !== undefined && !updates.client_name) updates.client_name = updates.client;
    // Coerce booleans
    if (updates.is_tax_return !== undefined) updates.is_tax_return = Boolean(updates.is_tax_return);
    if (updates.is_payroll    !== undefined) updates.is_payroll    = Boolean(updates.is_payroll);
    // Auto-set started_at when transitioning to in_progress
    if (rest.status === "in_progress") {
      const existing = db.getById("tasks", req.params.id);
      if (!existing?.started_at) updates.started_at = new Date().toISOString();
    }
    if (rest.status === "completed" && !rest.completed_at) {
      updates.completed_at = new Date().toISOString();
      // Compute task duration from started_at
      const existing = db.getById("tasks", req.params.id);
      const startedAt = existing?.started_at;
      if (startedAt) {
        updates.task_duration_minutes = Math.round(
          (new Date(updates.completed_at) - new Date(startedAt)) / 60000
        );
      }
    }
    if (rest.status && rest.status !== "completed" && rest.status !== "in_progress") {
      updates.completed_at = null;
    }
    const updated = db.update("tasks", req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, error: "Not found" });
    // Notify on reassignment
    if (rest.assigned_to)
      db.insert("notifications", {
        type: "task_assigned",
        message: `Task "${updated.title}" assigned to ${rest.assigned_to}`,
        entity_type: "task",
        entity_id: updated.id,
        user: rest.assigned_to,
        read: false,
      });
    // Activity log
    const actor = req.user?.name || rest.updated_by || rest.assigned_by || "Unknown";
    let action = "update";
    if (rest.status === "completed")   action = "complete";
    else if (rest.status === "in_progress") action = "start";
    else if (rest.assigned_to)         action = "assign";
    logActivity({
      userId:      req.user?.id,
      userName:    actor,
      userRole:    req.user?.role || rest.updated_by_role || "",
      action,
      module:      "task",
      entityId:    updated.id,
      entityTitle: updated.title,
      detail:      rest.status
        ? `Status changed to "${rest.status}" on "${updated.title}"`
        : rest.assigned_to
          ? `Assigned "${updated.title}" to ${rest.assigned_to}`
          : `Updated task "${updated.title}"`,
      ip: req.ip,
    });
    res.json({
      success: true,
      data: { ...updated, subtasks: parseJSON(updated.subtasks), tags: parseJSON(updated.tags) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Update Status ──────────────────────────────────────────────────────────
router.patch("/:id/status", optionalAuth, (req, res) => {
  try {
    const { status } = req.body;
    const updates = { status, workflow_stage: status };
    const existing = db.getById("tasks", req.params.id);
    if (status === "in_progress" && !existing?.started_at) {
      updates.started_at = new Date().toISOString();
    }
    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
      if (existing?.started_at) {
        updates.task_duration_minutes = Math.round(
          (new Date(updates.completed_at) - new Date(existing.started_at)) / 60000
        );
      }
    }
    const updated = db.update("tasks", req.params.id, updates);
    // Activity log for status change
    const taskForLog = existing || {};
    logActivity({
      userId:      req.user?.id,
      userName:    req.user?.name || req.body.changed_by || taskForLog.assigned_to || "Unknown",
      userRole:    req.user?.role || "",
      action:      status === "completed" ? "complete" : status === "in_progress" ? "start" : "update",
      module:      "task",
      entityId:    req.params.id,
      entityTitle: taskForLog.title || "",
      detail:      `Task "${taskForLog.title || req.params.id}" marked as ${status}`,
      ip:          req.ip,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Delete Task ────────────────────────────────────────────────────────────
router.delete("/:id", optionalAuth, (req, res) => {
  try {
    const task = db.getById("tasks", req.params.id);
    logActivity({
      userId:      req.user?.id,
      userName:    req.user?.name || req.query.deleted_by || "Unknown",
      userRole:    req.user?.role || "",
      action:      "delete",
      module:      "task",
      entityId:    req.params.id,
      entityTitle: task?.title || "",
      detail:      `Deleted task "${task?.title || req.params.id}"`,
      ip:          req.ip,
    });
    db.delete("tasks", req.params.id);
    db.getCollection("time_logs")
      .filter((l) => l.task_id === req.params.id)
      .forEach((l) => db.delete("time_logs", l.id));
    db.getCollection("task_comments")
      .filter((c) => c.task_id === req.params.id)
      .forEach((c) => db.delete("task_comments", c.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Time Logs ──────────────────────────────────────────────────────────────
router.get("/:id/time-logs", (req, res) => {
  try {
    const logs = db
      .getCollection("time_logs")
      .filter((l) => l.task_id === req.params.id)
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    const total = logs.reduce((s, l) => s + Number(l.duration_minutes || 0), 0);
    res.json({ success: true, data: { logs, total_minutes: total } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post("/:id/time-logs", authMiddleware, (req, res) => {
  try {
    const {
      user,
      duration_minutes,
      notes = "",
      started_at,
      ended_at,
    } = req.body;
    if (!duration_minutes || duration_minutes <= 0)
      return res.status(400).json({ success: false, error: "Duration required" });
    // Use logged-in user's name if not explicitly provided
    const logUser = user || req.user?.name || "Unknown";
    const log = db.insert("time_logs", {
      task_id: req.params.id,
      user: logUser,
      duration_minutes: Number(duration_minutes),
      notes,
      started_at: started_at || new Date().toISOString(),
      ended_at: ended_at || new Date().toISOString(),
    });
    const taskForTimeLog = db.getById("tasks", req.params.id);
    logActivity({
      userId:      req.user?.id,
      userName:    logUser,
      userRole:    req.user?.role || "",
      action:      "log_time",
      module:      "task",
      entityId:    req.params.id,
      entityTitle: taskForTimeLog?.title || "",
      detail:      `Logged ${duration_minutes}m on "${taskForTimeLog?.title || req.params.id}"${notes ? ` — ${notes}` : ""}`,
      ip:          req.ip,
    });
    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.patch("/:id/time-logs/:logId", (req, res) => {
  try {
    const { duration_minutes, notes, started_at, ended_at, user } = req.body;
    const updates = {};
    if (duration_minutes !== undefined) updates.duration_minutes = Number(duration_minutes);
    if (notes !== undefined) updates.notes = notes;
    if (started_at !== undefined) updates.started_at = started_at;
    if (ended_at !== undefined) updates.ended_at = ended_at;
    if (user !== undefined) updates.user = user;
    const updated = db.update("time_logs", req.params.logId, updates);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:id/time-logs/:logId", (req, res) => {
  try {
    db.delete("time_logs", req.params.logId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/:id/comments", (req, res) => {
  try {
    const { author = "Team Member", text, type = "user" } = req.body;
    if (!text) return res.status(400).json({ success: false, error: "Text required" });
    const comment = db.insert("task_comments", { task_id: req.params.id, author, text, type });
    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:id/comments/:cid", (req, res) => {
  try {
    db.delete("task_comments", req.params.cid);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /fix-titles — admin only: strip "Follow up on email: " prefix ──────
router.post("/fix-titles", authMiddleware, (req, res) => {
  try {
    if (!ADMIN_ROLES.has(req.user?.role)) {
      return res.status(403).json({ success: false, error: "Admins only" });
    }
    const allTasks = db.getCollection("tasks");
    let fixed = 0;
    allTasks.forEach(t => {
      if (t.title && t.title.startsWith("Follow up on email: ")) {
        const newTitle = t.title.replace(/^Follow up on email:\s*/i, "").trim();
        db.update("tasks", t.id, { title: newTitle });
        fixed++;
      }
    });
    res.json({ success: true, fixed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /reset-and-poll — admin only: clear all tasks + repoll inbox ───────
router.post("/reset-and-poll", authMiddleware, async (req, res) => {
  try {
    if (!ADMIN_ROLES.has(req.user?.role)) {
      return res.status(403).json({ success: false, error: "Admins only" });
    }

    // 1. Clear all tasks
    const allTasks = db.getCollection("tasks");
    allTasks.forEach(t => db.delete("tasks", t.id));

    // 2. Clear processed UIDs so emails are re-processed
    const allUids = db.getCollection("mail_processed_uids");
    allUids.forEach(u => db.delete("mail_processed_uids", u.id));

    // 3. Run the email poller immediately
    const { runPoll } = require("../services/email-poller");
    await runPoll();

    const newTasks = db.getCollection("tasks");
    res.json({
      success: true,
      cleared: allTasks.length,
      created: newTasks.length,
      tasks: newTasks.map(t => ({
        id: t.id,
        task_number: t.task_number,
        title: t.title,
        assigned_to: t.assigned_to,
        source_email: t.source_email,
        created_at: t.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
