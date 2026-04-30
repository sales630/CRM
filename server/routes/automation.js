/* eslint-disable */
const express = require("express");
const router = express.Router();
const db = require("../database");
const { authMiddleware } = require("./auth");

// ── Stages (mirrors frontend) ──────────────────────────────────────────────
const LEAD_STAGES = [
  "Fresh Leads", "Assigned Leads", "Connected / In Progress",
  "No Answer", "Need to connect in future",
  "Lead Won", "Lead Lost", "Junk Lead",
];

// ── Template variable replacer ─────────────────────────────────────────────
const interpolate = (str, data) => {
  if (!str || typeof str !== "string") return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => data[k] || "");
};

// ── Core Automation Engine ─────────────────────────────────────────────────
const runAutomation = (rule, entityData) => {
  const now = new Date().toISOString();
  const d = entityData || {};

  try {
    // Check condition
    if (rule.condition && rule.condition.field) {
      const { field, operator, value } = rule.condition;
      const actual = String(d[field] || "").toLowerCase();
      const expected = String(value || "").toLowerCase();
      let pass = false;
      if (operator === "equals")       pass = actual === expected;
      else if (operator === "contains") pass = actual.includes(expected);
      else if (operator === "not_empty") pass = actual.length > 0;
      else if (operator === "is_empty")  pass = actual.length === 0;
      if (!pass) {
        return { skipped: true, reason: "Condition not met" };
      }
    }

    const actionType = rule.action_type;
    const actionData = rule.action_data || {};
    let result = {};

    if (actionType === "create_task") {
      const title = interpolate(actionData.title || "Follow up with {name}", d);
      const deadline = actionData.deadline_days
        ? new Date(Date.now() + actionData.deadline_days * 86400000).toISOString()
        : null;
      const task = db.insert("tasks", {
        title,
        description: interpolate(actionData.description || "", d),
        assignee:  actionData.assignee  || d.responsible || "Govind Kaushik",
        assigned_to: actionData.assignee || d.responsible || "Govind Kaushik",
        priority:  actionData.priority  || "medium",
        status:    "pending",
        deadline,
        entity_type: "lead",
        entity_id:   d.id || null,
        created_by:  "Automation",
        tags: ["auto"],
      });
      result = { created: "task", task_id: task.id, title: task.title };

    } else if (actionType === "send_notification") {
      const message = interpolate(actionData.message || "Lead {name} action required", d);
      const targets = Array.isArray(actionData.to) ? actionData.to : [actionData.to || "responsible"];
      targets.forEach(target => {
        db.insert("notifications", {
          type:    "automation",
          title:   rule.name,
          message,
          target,
          entity_type: "lead",
          entity_id:   d.id || null,
          read:    false,
        });
      });
      result = { created: "notification", message };

    } else if (actionType === "change_stage") {
      if (d.id && actionData.new_stage) {
        db.update("leads", d.id, { stage: actionData.new_stage });
        result = { updated: "stage", new_stage: actionData.new_stage };
      }

    } else if (actionType === "change_responsible") {
      if (d.id && actionData.new_responsible) {
        db.update("leads", d.id, { responsible: actionData.new_responsible });
        result = { updated: "responsible", new_responsible: actionData.new_responsible };
      }

    } else if (actionType === "send_email") {
      // Log the email (actual sending requires SMTP config)
      result = {
        created: "email_log",
        subject: interpolate(actionData.subject || "", d),
        to:      d.email || actionData.to || "",
        body:    interpolate(actionData.body || "", d),
        note:    "Logged — configure SMTP in Mail settings to send",
      };

    } else if (actionType === "create_contact") {
      if (d.name || d.email) {
        const contact = db.insert("contacts", {
          name:       d.name    || "",
          email:      d.email   || "",
          phone:      d.phone   || "",
          company:    d.company || "",
          source:     d.source  || "Automation",
          responsible: actionData.assignee || d.responsible || "Govind Kaushik",
          status:     "active",
          notes:      `Auto-created from lead: ${d.title || d.id}`,
        });
        result = { created: "contact", contact_id: contact.id };
      }

    } else if (actionType === "edit_element") {
      if (d.id && actionData.field && actionData.value !== undefined) {
        db.update("leads", d.id, { [actionData.field]: actionData.value });
        result = { updated: actionData.field, value: actionData.value };
      }
    }

    // Log execution
    db.insert("automation_logs", {
      rule_id:     rule.id,
      rule_name:   rule.name,
      entity_type: "lead",
      entity_id:   d.id || null,
      entity_name: d.title || d.name || "",
      stage:       rule.stage,
      action_type: actionType,
      status:      "success",
      result,
    });

    return { success: true, result };

  } catch (err) {
    db.insert("automation_logs", {
      rule_id:     rule.id,
      rule_name:   rule.name,
      entity_type: "lead",
      entity_id:   d.id || null,
      stage:       rule.stage,
      action_type: rule.action_type,
      status:      "error",
      result:      { error: err.message },
    });
    return { success: false, error: err.message };
  }
};

// ── Trigger (called when lead stage changes) ───────────────────────────────
// POST /api/automation/trigger
router.post("/trigger", authMiddleware, (req, res) => {
  try {
    const { entity_type = "lead", entity_id, event = "stage_enter", stage, entity_data } = req.body;

    const rules = db.getCollection("automation_rules").filter(r =>
      r.status === "active" &&
      r.entity_type === entity_type &&
      r.stage === stage &&
      r.trigger === event
    );

    const results = [];

    rules.forEach(rule => {
      const timingVal = parseInt(rule.timing_value) || 0;
      const timingUnit = rule.timing_unit || "hours";

      if (timingVal === 0) {
        // Run immediately
        const r = runAutomation(rule, entity_data);
        results.push({ rule_id: rule.id, rule_name: rule.name, ...r });
      } else {
        // Schedule for later
        const ms = timingUnit === "days" ? timingVal * 86400000 : timingVal * 3600000;
        const execute_at = new Date(Date.now() + ms).toISOString();
        db.insert("automation_pending", {
          rule_id:     rule.id,
          entity_type,
          entity_id,
          entity_data,
          execute_at,
          status:      "pending",
        });
        results.push({ rule_id: rule.id, rule_name: rule.name, scheduled: execute_at });
      }
    });

    res.json({ success: true, data: { triggered: results.length, results } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── Process pending (time-delayed rules) ───────────────────────────────────
// POST /api/automation/process-pending
router.post("/process-pending", authMiddleware, (req, res) => {
  try {
    const now = new Date().toISOString();
    const pending = db.getCollection("automation_pending").filter(p =>
      p.status === "pending" && p.execute_at <= now
    );

    const results = [];
    pending.forEach(p => {
      const rule = db.getById("automation_rules", p.rule_id);
      if (!rule) { db.update("automation_pending", p.id, { status: "skipped" }); return; }

      // Refresh entity data from DB
      const live = p.entity_type === "lead" ? db.getById("leads", p.entity_id) : p.entity_data;
      const r = runAutomation(rule, live || p.entity_data);
      db.update("automation_pending", p.id, { status: "done", processed_at: now });
      results.push({ pending_id: p.id, rule_name: rule.name, ...r });
    });

    res.json({ success: true, data: { processed: results.length, results } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── Automation Rules CRUD ──────────────────────────────────────────────────

// GET /api/automation/rules
router.get("/rules", authMiddleware, (req, res) => {
  try {
    const { stage, entity_type } = req.query;
    let rules = db.getCollection("automation_rules");
    if (stage) rules = rules.filter(r => r.stage === stage);
    if (entity_type) rules = rules.filter(r => r.entity_type === entity_type);
    rules = rules.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    res.json({ success: true, data: rules });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// POST /api/automation/rules
router.post("/rules", authMiddleware, (req, res) => {
  try {
    const {
      name, stage, entity_type = "lead", trigger = "stage_enter",
      timing_value = 0, timing_unit = "hours",
      condition = null, action_type, action_data = {},
      status = "active", description = "",
    } = req.body;
    if (!name || !stage || !action_type)
      return res.json({ success: false, error: "name, stage, action_type required" });

    const rule = db.insert("automation_rules", {
      name, stage, entity_type, trigger,
      timing_value, timing_unit,
      condition, action_type, action_data,
      status, description,
    });
    res.json({ success: true, data: rule });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// PUT /api/automation/rules/:id
router.put("/rules/:id", authMiddleware, (req, res) => {
  try {
    const updated = db.update("automation_rules", req.params.id, req.body);
    if (!updated) return res.json({ success: false, error: "Not found" });
    res.json({ success: true, data: updated });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// DELETE /api/automation/rules/:id
router.delete("/rules/:id", authMiddleware, (req, res) => {
  try {
    db.delete("automation_rules", req.params.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// POST /api/automation/rules/:id/toggle
router.post("/rules/:id/toggle", authMiddleware, (req, res) => {
  try {
    const rule = db.getById("automation_rules", req.params.id);
    if (!rule) return res.json({ success: false, error: "Not found" });
    const updated = db.update("automation_rules", req.params.id, {
      status: rule.status === "active" ? "disabled" : "active",
    });
    res.json({ success: true, data: updated });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// POST /api/automation/rules/:id/test
router.post("/rules/:id/test", authMiddleware, (req, res) => {
  try {
    const rule = db.getById("automation_rules", req.params.id);
    if (!rule) return res.json({ success: false, error: "Not found" });
    // Use a dummy lead for testing
    const testLead = {
      id: "test-" + Date.now(),
      name: "Test Lead",
      title: "Test Lead - Automation Test",
      email: "test@example.com",
      phone: "+1-555-0100",
      responsible: "Govind Kaushik",
      stage: rule.stage,
      lead_for: "Outsourced Bookkeeping",
      ...(req.body || {}),
    };
    const result = runAutomation({ ...rule, name: rule.name + " [TEST]" }, testLead);
    res.json({ success: true, data: result });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── Task Templates CRUD ────────────────────────────────────────────────────

// GET /api/automation/templates
router.get("/templates", authMiddleware, (req, res) => {
  try {
    const templates = db.getCollection("automation_task_templates")
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ success: true, data: templates });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// POST /api/automation/templates
router.post("/templates", authMiddleware, (req, res) => {
  try {
    const {
      name, description = "", assignee = "", priority = "medium",
      deadline_days = null, checklist = [], tags = [],
      group = "", recurring = "none", recurring_interval = null,
    } = req.body;
    if (!name) return res.json({ success: false, error: "Name required" });
    const tpl = db.insert("automation_task_templates", {
      name, description, assignee, priority,
      deadline_days, checklist, tags, group,
      recurring, recurring_interval,
    });
    res.json({ success: true, data: tpl });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// PUT /api/automation/templates/:id
router.put("/templates/:id", authMiddleware, (req, res) => {
  try {
    const updated = db.update("automation_task_templates", req.params.id, req.body);
    if (!updated) return res.json({ success: false, error: "Not found" });
    res.json({ success: true, data: updated });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// DELETE /api/automation/templates/:id
router.delete("/templates/:id", authMiddleware, (req, res) => {
  try {
    db.delete("automation_task_templates", req.params.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// POST /api/automation/templates/:id/apply — create a real task from template
router.post("/templates/:id/apply", authMiddleware, (req, res) => {
  try {
    const tpl = db.getById("automation_task_templates", req.params.id);
    if (!tpl) return res.json({ success: false, error: "Template not found" });
    const overrides = req.body || {};
    const deadline = tpl.deadline_days
      ? new Date(Date.now() + tpl.deadline_days * 86400000).toISOString()
      : null;
    const task = db.insert("tasks", {
      title:       overrides.title       || tpl.name,
      description: overrides.description || tpl.description,
      assignee:    overrides.assignee    || tpl.assignee,
      assigned_to: overrides.assignee    || tpl.assignee,
      priority:    overrides.priority    || tpl.priority,
      status:      "pending",
      deadline:    overrides.deadline    || deadline,
      tags:        tpl.tags,
      checklist:   tpl.checklist.map(c => ({ text: c, done: false })),
      template_id: tpl.id,
      created_by:  overrides.created_by || "Manual",
    });
    res.json({ success: true, data: task });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── Automation Logs ────────────────────────────────────────────────────────

// GET /api/automation/logs
router.get("/logs", authMiddleware, (req, res) => {
  try {
    const { rule_id, status, limit = 100 } = req.query;
    let logs = db.getCollection("automation_logs");
    if (rule_id) logs = logs.filter(l => l.rule_id === rule_id);
    if (status)  logs = logs.filter(l => l.status === status);
    logs = logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, parseInt(limit));
    res.json({ success: true, data: logs });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── Stats ──────────────────────────────────────────────────────────────────
router.get("/stats", authMiddleware, (req, res) => {
  try {
    const rules     = db.getCollection("automation_rules");
    const templates = db.getCollection("automation_task_templates");
    const logs      = db.getCollection("automation_logs");
    const pending   = db.getCollection("automation_pending");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const byStage = {};
    rules.forEach(r => { byStage[r.stage] = (byStage[r.stage] || 0) + 1; });

    const byAction = {};
    rules.forEach(r => { byAction[r.action_type] = (byAction[r.action_type] || 0) + 1; });

    res.json({
      success: true,
      data: {
        total_rules:     rules.length,
        active_rules:    rules.filter(r => r.status === "active").length,
        total_templates: templates.length,
        total_executions: logs.length,
        today_executions: logs.filter(l => l.created_at >= todayStart).length,
        success_count:   logs.filter(l => l.status === "success").length,
        error_count:     logs.filter(l => l.status === "error").length,
        pending_count:   pending.filter(p => p.status === "pending").length,
        by_stage:        byStage,
        by_action:       byAction,
      },
    });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

module.exports = router;
