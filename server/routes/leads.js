const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../database");

// Fire automation rules when a lead enters a stage
const fireAutomation = (stage, leadData) => {
  try {
    const rules = db.getCollection("automation_rules").filter(r =>
      r.status === "active" && r.entity_type === "lead" &&
      r.stage === stage && r.trigger === "stage_enter"
    );
    if (!rules.length) return;
    // Run automation inline
    rules.forEach(rule => {
      const timingVal = parseInt(rule.timing_value) || 0;
      if (timingVal === 0) {
        // Run immediately - replicate engine logic
        const now = new Date().toISOString();
        const d = leadData || {};
        try {
          const actionType = rule.action_type;
          const actionData = rule.action_data || {};
          const interpolate = (str) => str ? str.replace(/\{(\w+)\}/g, (_, k) => d[k] || "") : str;

          if (actionType === "create_task") {
            db.insert("tasks", {
              title: interpolate(actionData.title || "Follow up with {name}"),
              description: interpolate(actionData.description || ""),
              assignee: actionData.assignee || d.responsible || "Govind Kaushik",
              assigned_to: actionData.assignee || d.responsible || "Govind Kaushik",
              priority: actionData.priority || "medium",
              status: "pending",
              deadline: actionData.deadline_days ? new Date(Date.now() + actionData.deadline_days * 86400000).toISOString() : null,
              entity_type: "lead", entity_id: d.id, created_by: "Automation", tags: ["auto"],
            });
          } else if (actionType === "send_notification") {
            db.insert("notifications", {
              type: "automation", title: rule.name,
              message: interpolate(actionData.message || "Lead {name} action required"),
              target: actionData.to || "responsible",
              entity_type: "lead", entity_id: d.id, read: false,
            });
          } else if (actionType === "change_responsible" && actionData.new_responsible) {
            db.update("leads", d.id, { responsible: actionData.new_responsible });
          } else if (actionType === "change_stage" && actionData.new_stage) {
            db.update("leads", d.id, { stage: actionData.new_stage });
          } else if (actionType === "create_contact" && (d.name || d.email)) {
            db.insert("contacts", {
              name: d.name || "", email: d.email || "", phone: d.phone || "",
              company: d.company || "", source: "Automation",
              responsible: actionData.assignee || d.responsible || "Govind Kaushik",
              status: "active",
            });
          }
          db.insert("automation_logs", {
            rule_id: rule.id, rule_name: rule.name, entity_type: "lead",
            entity_id: d.id, entity_name: d.title || d.name || "", stage,
            action_type: actionType, status: "success", result: { ran: true },
          });
        } catch (err) {
          db.insert("automation_logs", {
            rule_id: rule.id, rule_name: rule.name, entity_type: "lead",
            entity_id: leadData?.id, stage, action_type: rule.action_type,
            status: "error", result: { error: err.message },
          });
        }
      } else {
        // Schedule for later
        const ms = rule.timing_unit === "days" ? rule.timing_value * 86400000 : rule.timing_value * 3600000;
        db.insert("automation_pending", {
          rule_id: rule.id, entity_type: "lead", entity_id: leadData?.id,
          entity_data: leadData, execute_at: new Date(Date.now() + ms).toISOString(), status: "pending",
        });
      }
    });
  } catch (e) {
    console.error("Automation fire error:", e.message);
  }
};

router.get("/stats/summary", (req, res) => {
  try {
    const leads = db.getCollection("leads");
    const total = leads.length;
    const totalAmount = leads.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const byStage = {};
    leads.forEach((l) => {
      byStage[l.stage] = byStage[l.stage] || { stage: l.stage, count: 0, total: 0 };
      byStage[l.stage].count++;
      byStage[l.stage].total += Number(l.amount) || 0;
    });
    const bySource = {};
    leads.forEach((l) => {
      bySource[l.source] = bySource[l.source] || { source: l.source, count: 0 };
      bySource[l.source].count++;
    });
    const recent = [...leads]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);
    res.json({
      success: true,
      data: {
        total,
        totalAmount,
        byStage: Object.values(byStage),
        bySource: Object.values(bySource)
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
        recent,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/", (req, res) => {
  try {
    const { stage, status, search, responsible } = req.query;
    let leads = db.getCollection("leads");
    if (stage) leads = leads.filter((l) => l.stage === stage);
    if (status) leads = leads.filter((l) => l.status === status);
    if (responsible) leads = leads.filter((l) => l.responsible === responsible);
    if (search) {
      const t = search.toLowerCase();
      leads = leads.filter((l) =>
        ["title", "name", "phone", "email", "company"].some((f) =>
          (l[f] || "").toLowerCase().includes(t)
        )
      );
    }
    leads = leads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ success: true, data: leads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id", (req, res) => {
  try {
    const lead = db.getById("leads", req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: "Lead not found" });
    const activities = db
      .find("activities", { entity_type: "lead", entity_id: req.params.id })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const comments = db
      .find("comments", { entity_type: "lead", entity_id: req.params.id })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ success: true, data: { ...lead, activities, comments } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", (req, res) => {
  try {
    const {
      title,
      name = "",
      phone = "",
      email = "",
      amount = 0,
      currency = "USD",
      stage = "Fresh Leads",
      source = "Website",
      responsible = "Govind Kaushik",
      company = "",
      notes = "",
      priority = "medium",
      status = "active",
      lead_for = "",
      present_software = "",
      country = "",
      meeting_feedback = "",
    } = req.body;
    if (!title) return res.status(400).json({ success: false, error: "Title is required" });
    const lead = db.insert("leads", {
      title, name, phone, email, amount, currency, stage, source,
      responsible, company, notes, priority, status,
      lead_for, present_software, country, meeting_feedback,
    });
    // Fire automation for new lead entering its initial stage
    fireAutomation(stage, lead);
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:id", (req, res) => {
  try {
    const fields = [
      "title",
      "name",
      "phone",
      "email",
      "amount",
      "currency",
      "stage",
      "source",
      "responsible",
      "company",
      "notes",
      "priority",
      "status",
      "present_software",
      "country",
      "lead_for",
    ];
    const updates = {};
    fields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    const updated = db.update("leads", req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, error: "Lead not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/:id/stage", (req, res) => {
  try {
    const { stage } = req.body;
    if (!stage) return res.status(400).json({ success: false, error: "Stage required" });
    const updated = db.update("leads", req.params.id, { stage });
    if (!updated) return res.status(404).json({ success: false, error: "Lead not found" });
    // Fire automation rules for the new stage
    fireAutomation(stage, updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    db.delete("leads", req.params.id);
    db.deleteWhere("activities", { entity_type: "lead", entity_id: req.params.id });
    db.deleteWhere("comments", { entity_type: "lead", entity_id: req.params.id });
    res.json({ success: true, message: "Lead deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/", (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ success: false, error: "ids required" });
    db.deleteMany("leads", ids);
    res.json({ success: true, message: `${ids.length} leads deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
