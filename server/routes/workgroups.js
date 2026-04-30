/* eslint-disable */
const express = require("express");
const router = express.Router();
const db = require("../database");
const { authMiddleware } = require("./auth");

// ── Default stages for new workgroups ─────────────────────────────────────
const DEFAULT_STAGES = [
  { id: "stage-atl", name: "Assign to Team Leader",   color: "#3f51b5" },
  { id: "stage-dtt", name: "Distribute to Team",      color: "#00bcd4" },
  { id: "stage-ip",  name: "In Progress",             color: "#4caf50" },
  { id: "stage-ftl", name: "Finished - TL",           color: "#ff9800" },
  { id: "stage-pfr", name: "Pending For Review",      color: "#9c27b0" },
  { id: "stage-rde", name: "Review Done - Email Sent",color: "#607d8b" },
];

function getGroupStages(group) {
  try {
    const s = typeof group.stages === "string" ? JSON.parse(group.stages) : group.stages;
    return Array.isArray(s) && s.length ? s : [...DEFAULT_STAGES];
  } catch { return [...DEFAULT_STAGES]; }
}

// ── Default automation rules (one per key stage) ──────────────────────────
const DEFAULT_RULES = [
  {
    name: "Notify Assignee on Assignment",
    stage: "stage-atl", timing: "immediately", action_type: "send_notification",
    action_data: { to: "assignee", message: "You have a new task assigned. Please review and distribute to your team." },
  },
  {
    name: "In Progress Notification",
    stage: "stage-ip", timing: "immediately", action_type: "send_notification",
    action_data: { to: "assignee", message: "Your task is now In Progress. Track your time and update status regularly." },
  },
  {
    name: "Finished — Notify Team Leader",
    stage: "stage-ftl", timing: "immediately", action_type: "send_notification",
    action_data: { to: "assignee", message: "Task marked Finished. Awaiting Team Leader review before moving to Pending For Review." },
  },
  {
    name: "Pending Review Alert",
    stage: "stage-pfr", timing: "immediately", action_type: "send_notification",
    action_data: { to: "assignee", message: "Task is Pending For Review. Please review, approve, or send back with comments." },
  },
  {
    name: "Completion Notification",
    stage: "stage-rde", timing: "immediately", action_type: "send_notification",
    action_data: { to: "assignee", message: "Task complete — review done and email sent to client. Great work!" },
  },
];

// ── Default triggers (one per stage — fires when task ENTERS that stage) ──
const DEFAULT_TRIGGERS = [
  { name: "Task enters Assign to Team Leader",   stage_id: "stage-atl", type: "stage_enter" },
  { name: "Task enters Distribute to Team",       stage_id: "stage-dtt", type: "stage_enter" },
  { name: "Task enters In Progress",              stage_id: "stage-ip",  type: "stage_enter" },
  { name: "Task enters Finished - TL",            stage_id: "stage-ftl", type: "stage_enter" },
  { name: "Task enters Pending For Review",       stage_id: "stage-pfr", type: "stage_enter" },
  { name: "Task enters Review Done - Email Sent", stage_id: "stage-rde", type: "stage_enter" },
];

function seedAutomationForGroup(workgroupId) {
  DEFAULT_RULES.forEach(r =>
    db.insert("automation_rules", { ...r, workgroup_id: workgroupId, entity_type: "workgroup_task", status: "active" })
  );
  DEFAULT_TRIGGERS.forEach(t =>
    db.insert("workgroup_triggers", { ...t, workgroup_id: workgroupId })
  );
}

// ── Run automation rules when a task enters a stage ───────────────────────
function runWorkgroupAutomation(workgroupId, stageId, task) {
  const rules = db.getCollection("automation_rules").filter(r =>
    r.workgroup_id === workgroupId &&
    r.status !== "disabled" &&
    r.stage === stageId
  );
  rules.forEach(rule => {
    try {
      const ad = rule.action_data || {};
      if (rule.action_type === "send_notification") {
        db.insert("notifications", {
          type:        "automation",
          title:       rule.name || "Automation",
          message:     ad.message || `Task "${task.title}" moved to a new stage`,
          user_id:     ad.to === "assignee" ? task.assigned_to_id : ad.user_id,
          target:      ad.to || "assignee",
          entity_type: "task",
          entity_id:   task.id,
          read:        false,
        });
      } else if (rule.action_type === "create_task") {
        db.insert("tasks", {
          title:          ad.title || `Follow up: ${task.title}`,
          description:    ad.description || "",
          assignee:       ad.assignee === "assignee" ? task.assignee : (ad.assignee || task.assignee || ""),
          assigned_to:    ad.assignee === "assignee" ? task.assigned_to : (ad.assignee || task.assigned_to || ""),
          priority:       ad.priority || "medium",
          status:         "pending",
          workgroup_id:   workgroupId,
          workgroup_stage: ad.stage_id || stageId,
          created_by:     "Automation",
        });
      } else if (rule.action_type === "change_stage" && ad.stage_id) {
        db.update("tasks", task.id, { workgroup_stage: ad.stage_id, updated_at: new Date().toISOString() });
      } else if (rule.action_type === "edit_task" && ad.field) {
        db.update("tasks", task.id, { [ad.field]: ad.value, updated_at: new Date().toISOString() });
      }
      db.insert("automation_logs", {
        rule_id: rule.id, rule_name: rule.name,
        entity_type: "workgroup_task", entity_id: task.id,
        entity_name: task.title, stage: stageId,
        action_type: rule.action_type, status: "success", result: {},
      });
    } catch (err) {
      db.insert("automation_logs", {
        rule_id: rule.id, rule_name: rule.name,
        entity_type: "workgroup_task", entity_id: task.id,
        stage: stageId, action_type: rule.action_type,
        status: "error", result: { error: err.message },
      });
    }
  });
}

// ── WORKGROUPS CRUD ───────────────────────────────────────────────────────

router.get("/", authMiddleware, (req, res) => {
  try {
    const { search, type, privacy } = req.query;
    let groups = db.getCollection("workgroups");
    if (search) { const q = search.toLowerCase(); groups = groups.filter(g => (g.name || "").toLowerCase().includes(q) || (g.description || "").toLowerCase().includes(q)); }
    if (type)    groups = groups.filter(g => g.type === type);
    if (privacy) groups = groups.filter(g => g.privacy === privacy);
    groups = groups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ success: true, data: groups });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.get("/:id", authMiddleware, (req, res) => {
  try {
    const group = db.getById("workgroups", req.params.id);
    if (!group) return res.json({ success: false, error: "Workgroup not found" });
    res.json({ success: true, data: group });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.post("/", authMiddleware, (req, res) => {
  try {
    const { name, type, privacy, description, members } = req.body;
    if (!name) return res.json({ success: false, error: "Name is required" });
    const user = req.user;
    const ownerName = user?.name || "Unknown";
    const group = db.insert("workgroups", {
      name, type: type || "workgroup", privacy: privacy || "Private",
      description: description || "",
      members: JSON.stringify(Array.isArray(members) ? members : [ownerName]),
      stages: JSON.stringify(DEFAULT_STAGES),
      owner: ownerName, owner_id: String(user?.id || ""),
    });
    // Auto-create default automation rules + triggers for every new workgroup
    seedAutomationForGroup(group.id);
    res.json({ success: true, data: group });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.put("/:id", authMiddleware, (req, res) => {
  try {
    const existing = db.getById("workgroups", req.params.id);
    if (!existing) return res.json({ success: false, error: "Workgroup not found" });
    const { name, type, privacy, description, members } = req.body;
    const updated = db.update("workgroups", req.params.id, {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(privacy !== undefined && { privacy }),
      ...(description !== undefined && { description }),
      ...(members !== undefined && { members: JSON.stringify(members) }),
      updated_at: new Date().toISOString(),
    });
    res.json({ success: true, data: updated });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.post("/:id/join", authMiddleware, (req, res) => {
  try {
    const group = db.getById("workgroups", req.params.id);
    if (!group) return res.json({ success: false, error: "Workgroup not found" });
    const userName = req.user?.name || "";
    let members = [];
    try { members = JSON.parse(group.members || "[]"); } catch {}
    if (!members.includes(userName)) {
      members.push(userName);
      db.update("workgroups", req.params.id, { members: JSON.stringify(members), updated_at: new Date().toISOString() });
    }
    res.json({ success: true, data: { joined: true } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.delete("/:id", authMiddleware, (req, res) => {
  try {
    db.delete("workgroups", req.params.id);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── STAGES ────────────────────────────────────────────────────────────────

router.get("/:id/stages", authMiddleware, (req, res) => {
  try {
    const group = db.getById("workgroups", req.params.id);
    if (!group) return res.json({ success: false, error: "Workgroup not found" });
    res.json({ success: true, data: getGroupStages(group) });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.put("/:id/stages", authMiddleware, (req, res) => {
  try {
    const { stages } = req.body;
    db.update("workgroups", req.params.id, { stages: JSON.stringify(stages), updated_at: new Date().toISOString() });
    res.json({ success: true, data: stages });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── WORKGROUP TASKS ───────────────────────────────────────────────────────

router.get("/:id/tasks", authMiddleware, (req, res) => {
  try {
    const tasks = db.getCollection("tasks").filter(t => t.workgroup_id === req.params.id);
    res.json({ success: true, data: tasks });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.post("/:id/tasks", authMiddleware, (req, res) => {
  try {
    const { title, stage_id, assignee, priority, description, deadline } = req.body;
    if (!title) return res.json({ success: false, error: "Title required" });
    const group = db.getById("workgroups", req.params.id);
    const stages = getGroupStages(group || {});
    const defaultStage = stages[0]?.id || "stage-1";
    const task = db.insert("tasks", {
      title,
      workgroup_id:    req.params.id,
      workgroup_stage: stage_id || defaultStage,
      status:          "pending",
      assignee:        assignee || req.user.name,
      assigned_to:     assignee || req.user.name,
      priority:        priority || "medium",
      description:     description || "",
      deadline:        deadline || null,
      created_by:      req.user.name,
    });
    // Trigger automation for this stage
    runWorkgroupAutomation(req.params.id, task.workgroup_stage, task);
    res.json({ success: true, data: task });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.put("/:id/tasks/:taskId", authMiddleware, (req, res) => {
  try {
    const updated = db.update("tasks", req.params.taskId, { ...req.body, updated_at: new Date().toISOString() });
    res.json({ success: true, data: updated });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// Move task to a different stage (triggers automation)
router.patch("/:id/tasks/:taskId/stage", authMiddleware, (req, res) => {
  try {
    const { stage_id } = req.body;
    const task = db.getById("tasks", req.params.taskId);
    if (!task) return res.json({ success: false, error: "Task not found" });
    const updated = db.update("tasks", req.params.taskId, { workgroup_stage: stage_id, updated_at: new Date().toISOString() });
    runWorkgroupAutomation(req.params.id, stage_id, updated || task);
    res.json({ success: true, data: updated });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.delete("/:id/tasks/:taskId", authMiddleware, (req, res) => {
  try {
    db.delete("tasks", req.params.taskId);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── AUTOMATION TRIGGERS ───────────────────────────────────────────────────

router.get("/:id/automation/triggers", authMiddleware, (req, res) => {
  try {
    let triggers = db.getCollection("workgroup_triggers").filter(t => t.workgroup_id === req.params.id);
    // Auto-seed triggers for existing workgroups that have none yet
    if (triggers.length === 0) {
      const rules = db.getCollection("automation_rules").filter(r => r.workgroup_id === req.params.id);
      if (rules.length === 0) {
        // Neither rules nor triggers — seed both together so we don't double-seed
        seedAutomationForGroup(req.params.id);
        triggers = db.getCollection("workgroup_triggers").filter(t => t.workgroup_id === req.params.id);
      } else {
        // Has rules but no triggers — just seed triggers
        DEFAULT_TRIGGERS.forEach(t =>
          db.insert("workgroup_triggers", { ...t, workgroup_id: req.params.id })
        );
        triggers = db.getCollection("workgroup_triggers").filter(t => t.workgroup_id === req.params.id);
      }
    }
    res.json({ success: true, data: triggers });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.post("/:id/automation/triggers", authMiddleware, (req, res) => {
  try {
    const trigger = db.insert("workgroup_triggers", { ...req.body, workgroup_id: req.params.id });
    res.json({ success: true, data: trigger });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.delete("/:id/automation/triggers/:triggerId", authMiddleware, (req, res) => {
  try {
    db.delete("workgroup_triggers", req.params.triggerId);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── AUTOMATION RULES (per workgroup) ─────────────────────────────────────

router.get("/:id/automation/rules", authMiddleware, (req, res) => {
  try {
    let rules = db.getCollection("automation_rules").filter(r => r.workgroup_id === req.params.id);
    // Auto-seed rules for existing workgroups that have none yet
    if (rules.length === 0) {
      DEFAULT_RULES.forEach(r =>
        db.insert("automation_rules", { ...r, workgroup_id: req.params.id, entity_type: "workgroup_task", status: "active" })
      );
      rules = db.getCollection("automation_rules").filter(r => r.workgroup_id === req.params.id);
    }
    res.json({ success: true, data: rules });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.post("/:id/automation/rules", authMiddleware, (req, res) => {
  try {
    const rule = db.insert("automation_rules", {
      ...req.body,
      workgroup_id: req.params.id,
      entity_type:  "workgroup_task",
      status:       "active",
    });
    res.json({ success: true, data: rule });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.put("/:id/automation/rules/:ruleId", authMiddleware, (req, res) => {
  try {
    const updated = db.update("automation_rules", req.params.ruleId, req.body);
    res.json({ success: true, data: updated });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.delete("/:id/automation/rules/:ruleId", authMiddleware, (req, res) => {
  try {
    db.delete("automation_rules", req.params.ruleId);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── ACTIVITY FEED ─────────────────────────────────────────────────────────

router.get("/:id/activity", authMiddleware, (req, res) => {
  try {
    const tasks = db.getCollection("tasks")
      .filter(t => t.workgroup_id === req.params.id)
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 30);
    const taskIds = new Set(tasks.map(t => t.id));
    const logs = db.getCollection("automation_logs")
      .filter(l => taskIds.has(l.entity_id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);
    res.json({ success: true, data: { tasks, logs } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── SEED DEMO DATA ────────────────────────────────────────────────────────

router.post("/:id/seed", authMiddleware, (req, res) => {
  try {
    const group = db.getById("workgroups", req.params.id);
    if (!group) return res.json({ success: false, error: "Workgroup not found" });

    // Update to accounting workflow stages
    db.update("workgroups", req.params.id, {
      stages: JSON.stringify(DEFAULT_STAGES),
      updated_at: new Date().toISOString(),
    });

    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const sampleTasks = [
      {
        title: "Pending For Review - Temple Family Dentistry - Weekly Bookkeeping",
        assignee: "Meenakshi", assigned_to: "Meenakshi",
        priority: "medium", workgroup_stage: "stage-pfr",
        created_by: "Nandini Dhiman",
        description: "Weekly bookkeeping review for Temple Family Dentistry client. Please verify all transactions and reconcile accounts.",
      },
      {
        title: "Mario Gomez - Up To Date April 2026",
        assignee: "Nandini Dhiman", assigned_to: "Nandini Dhiman",
        priority: "high", workgroup_stage: "stage-dtt",
        deadline: in7days, created_by: "Nandini Dhiman",
        description: "Monthly bookkeeping update for Mario Gomez through April 2026. All transactions need to be categorized and bank feeds reconciled.",
      },
      {
        title: "FW: 2025 Business Return Information Request",
        assignee: "Meenakshi", assigned_to: "Meenakshi",
        priority: "high", workgroup_stage: "stage-atl",
        deadline: in3days, created_by: "Mohinder Singh",
        description: "Business tax return information request. Need to gather supporting documents from client before filing deadline.",
      },
    ];

    const tasks = sampleTasks.map(t =>
      db.insert("tasks", { ...t, workgroup_id: req.params.id, status: "pending" })
    );

    const sampleRules = [
      { name: "Notify Assignee on Assignment", stage: "stage-atl", timing: "immediately", action_type: "send_notification", action_data: { to: "assignee", message: "You have a new task assigned. Please review and distribute to your team." } },
      { name: "In Progress Notification",      stage: "stage-ip",  timing: "immediately", action_type: "send_notification", action_data: { to: "assignee", message: "Your task is now In Progress. Track your time and update regularly." } },
      { name: "Pending Review Alert",          stage: "stage-pfr", timing: "immediately", action_type: "send_notification", action_data: { to: "assignee", message: "Task is Pending For Review. Please review and approve or send back." } },
      { name: "Completion Notification",       stage: "stage-rde", timing: "immediately", action_type: "send_notification", action_data: { to: "assignee", message: "Task complete — review done and email sent to client." } },
    ];

    const rules = sampleRules.map(r =>
      db.insert("automation_rules", { ...r, workgroup_id: req.params.id, entity_type: "workgroup_task", status: "active" })
    );

    res.json({ success: true, data: { stages: DEFAULT_STAGES, tasks, rules } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

module.exports = router;
