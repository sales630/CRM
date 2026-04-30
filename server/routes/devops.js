/* eslint-disable */
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const db = require("../database");
const { authMiddleware } = require("./auth");

// ── Helper ─────────────────────────────────────────────────────────────────
const generateToken = () => crypto.randomBytes(24).toString("hex");

// ── Webhooks CRUD (authenticated) ──────────────────────────────────────────

// GET /api/devops/webhooks
router.get("/webhooks", authMiddleware, (req, res) => {
  try {
    const webhooks = db.getCollection("webhooks");
    const logs = db.getCollection("webhook_logs");
    const enriched = webhooks.map(w => ({
      ...w,
      trigger_count: logs.filter(l => l.webhook_id === w.id).length,
      last_triggered: logs
        .filter(l => l.webhook_id === w.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]?.created_at || null,
    }));
    res.json({ success: true, data: enriched });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// GET /api/devops/webhooks/:id
router.get("/webhooks/:id", authMiddleware, (req, res) => {
  try {
    const webhook = db.getById("webhooks", req.params.id);
    if (!webhook) return res.json({ success: false, error: "Not found" });
    res.json({ success: true, data: webhook });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// POST /api/devops/webhooks
router.post("/webhooks", authMiddleware, (req, res) => {
  try {
    const {
      name, type = "inbound", entity = "lead",
      description = "", field_mapping = {}, status = "active",
      outbound_url = "", outbound_events = [], redirect_url = "",
    } = req.body;
    if (!name) return res.json({ success: false, error: "Name required" });
    const token = generateToken();
    const webhook = db.insert("webhooks", {
      name, type, entity, description,
      field_mapping, status, token,
      outbound_url, outbound_events, redirect_url,
    });
    res.json({ success: true, data: webhook });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// PUT /api/devops/webhooks/:id
router.put("/webhooks/:id", authMiddleware, (req, res) => {
  try {
    const updated = db.update("webhooks", req.params.id, req.body);
    if (!updated) return res.json({ success: false, error: "Not found" });
    res.json({ success: true, data: updated });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// DELETE /api/devops/webhooks/:id
router.delete("/webhooks/:id", authMiddleware, (req, res) => {
  try {
    db.delete("webhooks", req.params.id);
    // Also delete logs for this webhook
    const logs = db.getCollection("webhook_logs").filter(l => l.webhook_id !== req.params.id);
    db.data["webhook_logs"] = logs;
    db.save();
    res.json({ success: true, data: { deleted: true } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── Webhook Logs ───────────────────────────────────────────────────────────

// GET /api/devops/logs
router.get("/logs", authMiddleware, (req, res) => {
  try {
    const { webhook_id, limit = 50 } = req.query;
    let logs = db.getCollection("webhook_logs");
    if (webhook_id) logs = logs.filter(l => l.webhook_id === webhook_id);
    logs = logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, parseInt(limit));
    // Enrich with webhook name
    const webhooks = db.getCollection("webhooks");
    logs = logs.map(l => ({
      ...l,
      webhook_name: webhooks.find(w => w.id === l.webhook_id)?.name || "—",
    }));
    res.json({ success: true, data: logs });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── Statistics ─────────────────────────────────────────────────────────────

// GET /api/devops/stats
router.get("/stats", authMiddleware, (req, res) => {
  try {
    const webhooks = db.getCollection("webhooks");
    const logs = db.getCollection("webhook_logs");
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const logsToday = logs.filter(l => l.created_at >= todayStart).length;
    const logsWeek = logs.filter(l => l.created_at >= weekStart).length;
    const logsMonth = logs.filter(l => l.created_at >= monthStart).length;

    // By day for last 30 days
    const byDay = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().split("T")[0];
      byDay[key] = 0;
    }
    logs.forEach(l => {
      const key = l.created_at.split("T")[0];
      if (byDay[key] !== undefined) byDay[key]++;
    });

    // Success vs error
    const successCount = logs.filter(l => l.status === "success").length;
    const errorCount = logs.filter(l => l.status === "error").length;

    // By entity
    const byEntity = {};
    webhooks.forEach(w => {
      byEntity[w.entity] = (byEntity[w.entity] || 0) + logs.filter(l => l.webhook_id === w.id).length;
    });

    res.json({
      success: true,
      data: {
        total_webhooks: webhooks.length,
        active_webhooks: webhooks.filter(w => w.status === "active").length,
        total_triggers: logs.length,
        triggers_today: logsToday,
        triggers_week: logsWeek,
        triggers_month: logsMonth,
        success_count: successCount,
        error_count: errorCount,
        by_day: byDay,
        by_entity: byEntity,
      },
    });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── Regenerate Token ───────────────────────────────────────────────────────

// POST /api/devops/webhooks/:id/regenerate
router.post("/webhooks/:id/regenerate", authMiddleware, (req, res) => {
  try {
    const webhook = db.getById("webhooks", req.params.id);
    if (!webhook) return res.json({ success: false, error: "Not found" });
    const updated = db.update("webhooks", req.params.id, { token: generateToken() });
    res.json({ success: true, data: updated });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── Test Webhook ── creates a real test lead/contact/task ─────────────────
// POST /api/devops/webhooks/:id/test
router.post("/webhooks/:id/test", authMiddleware, (req, res) => {
  try {
    const webhook = db.getById("webhooks", req.params.id);
    if (!webhook) return res.json({ success: false, error: "Not found" });

    // Build a realistic test payload
    const testPayload = {
      name:    "Test Contact (Webhook)",
      email:   "test.webhook@example.com",
      phone:   "+1-555-0199",
      company: "Test Company Ltd",
      notes:   "This is a test lead created from the DevOps panel",
      source:  "Website",
      ...(req.body || {}),  // allow caller to supply custom test data
    };

    // Apply field mapping
    const mapping = webhook.field_mapping || {};
    const entityData = {};
    Object.entries(mapping).forEach(([formField, crmField]) => {
      if (testPayload[formField] !== undefined) entityData[crmField] = testPayload[formField];
    });
    // Auto-fill unmapped fields
    const AUTO = { name: ["name"], email: ["email"], phone: ["phone"], company: ["company"], notes: ["notes"], source: ["source"] };
    Object.entries(AUTO).forEach(([crmF, aliases]) => {
      if (!entityData[crmF]) {
        for (const a of aliases) { if (testPayload[a]) { entityData[crmF] = testPayload[a]; break; } }
      }
    });

    let entityId = null;
    const entityType = webhook.entity;

    if (entityType === "lead") {
      entityData.title       = `[TEST] ${webhook.name} - ${entityData.name || "Test Lead"}`;
      entityData.source      = entityData.source   || "Website";
      entityData.stage       = "Fresh Leads";
      entityData.status      = "active";
      entityData.responsible = entityData.responsible || req.user?.name || "";
      entityData.priority    = "medium";
      entityData.amount      = 0;
      const lead = db.insert("leads", entityData);
      entityId = lead.id;
      // Notification
      db.insert("notifications", {
        type: "webhook_lead", message: `[TEST] New lead from webhook "${webhook.name}": ${entityData.name || entityData.email || "Unknown"}`,
        entity_type: "lead", entity_id: lead.id, user: req.user?.name || "", read: false,
      });
    } else if (entityType === "contact") {
      entityData.status = "active";
      const c = db.insert("contacts", entityData);
      entityId = c.id;
    } else if (entityType === "task") {
      entityData.title = entityData.title || `[TEST] Webhook Task - ${webhook.name}`;
      entityData.status = "pending";
      const t = db.insert("tasks", entityData);
      entityId = t.id;
    }

    db.update("webhooks", webhook.id, {
      trigger_count: (webhook.trigger_count || 0) + 1,
      last_triggered: new Date().toISOString(),
    });

    db.insert("webhook_logs", {
      webhook_id: webhook.id,
      source_ip: req.ip,
      method: "TEST",
      payload: testPayload,
      status: "success",
      result: { entity_type: entityType, entity_id: entityId, test: true },
    });

    res.json({ success: true, data: { message: `Test ${entityType} created`, entity_id: entityId, entity_type: entityType } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── PUBLIC Inbound Webhook Receiver (NO auth) ──────────────────────────────
// POST /api/devops/receive/:token
// Handles: WPForms, Gravity Forms, Contact Form 7, generic JSON/form POST

// CORS preflight for cross-origin form/fetch submissions
router.options("/receive/:token", (req, res) => {
  res.set({
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  }).sendStatus(200);
});

router.post("/receive/:token", (req, res) => {
  // Allow any origin so website forms and fetch() calls work cross-domain
  res.set({
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  try {
    const webhooks = db.getCollection("webhooks");
    const webhook = webhooks.find(w => w.token === req.params.token && w.type === "inbound" && w.status === "active");

    if (!webhook) {
      return res.status(404).json({ success: false, error: "Webhook not found or inactive" });
    }

    const rawPayload = req.body;

    // ── Normalise payload from various WP form plugins ─────────────────────
    // WPForms sends: { "fields": { "1": { "value": "..." }, "2": { "value": "..." } } }
    //   or flat:    { "wpforms[fields][1]": "...", ... }
    // Gravity Forms: { "1": "John", "2.3": "Doe", "input_1": "John" }
    // CF7:           { "your-name": "John", "your-email": "..." }
    // Generic JSON:  { "name": "John", "email": "...", ... }

    const flat = {};

    // WPForms nested: { fields: { "1": { value: "x", name: "Name" }, ... } }
    if (rawPayload.fields && typeof rawPayload.fields === "object") {
      Object.entries(rawPayload.fields).forEach(([, field]) => {
        if (field && field.name && field.value !== undefined) {
          flat[field.name.toLowerCase().replace(/\s+/g, "_")] = field.value;
        }
      });
    }

    // WPForms form meta
    if (rawPayload.form_title) flat["form_title"] = rawPayload.form_title;

    // Gravity Forms: top-level numeric keys like "1", "2", "input_1"
    Object.entries(rawPayload).forEach(([k, v]) => {
      if (typeof v === "string" || typeof v === "number") {
        // input_1 → input_1, "1" → field_1, "your-name" → your_name
        const norm = k.replace(/-/g, "_").toLowerCase();
        flat[norm] = v;
        if (/^input_\d/.test(k)) flat[k] = v;
        if (/^\d+$/.test(k)) flat[`field_${k}`] = v;
      }
    });

    // Flatten nested objects (e.g. { name: { first: "A", last: "B" } })
    const deepFlatten = (obj, prefix = "") => {
      if (!obj || typeof obj !== "object") return;
      Object.entries(obj).forEach(([k, v]) => {
        const key = prefix ? `${prefix}_${k}` : k;
        if (typeof v === "object" && v !== null) deepFlatten(v, key);
        else flat[key.toLowerCase().replace(/[\s-]/g, "_")] = v;
      });
    };
    deepFlatten(rawPayload);

    // ── Apply user-configured field mapping ────────────────────────────────
    const mapping = webhook.field_mapping || {};
    const entityData = {};

    // First pass: apply explicit mapping
    Object.entries(mapping).forEach(([formField, crmField]) => {
      const norm = formField.toLowerCase().replace(/[\s-]/g, "_");
      const val = flat[norm] ?? flat[formField] ?? rawPayload[formField];
      if (val !== undefined && val !== "") entityData[crmField] = val;
    });

    // Second pass: auto-detect common CRM fields from flat payload
    const AUTO_MAP = {
      // name variations
      name: ["name","full_name","your_name","contact_name","fullname","client_name","field_name","wpf_name"],
      email: ["email","your_email","email_address","contact_email","field_email","e_mail"],
      phone: ["phone","telephone","your_phone","contact_phone","mobile","phone_number","field_phone"],
      company: ["company","company_name","organization","business","firm"],
      notes: ["notes","message","your_message","comment","comments","description","inquiry","question","how_can_we_help","please_share"],
      source: ["source","lead_source","utm_source","referral_source"],
      lead_for: ["lead_for","service","interested_in","service_interest","product","package"],
      present_software: ["present_software","current_software","accounting_software","software","present_accounting_software"],
      country: ["country","location","region"],
      amount: ["amount","budget","value","deal_value"],
      responsible: ["responsible","assigned_to","owner"],
    };

    Object.entries(AUTO_MAP).forEach(([crmField, aliases]) => {
      if (entityData[crmField]) return; // already mapped
      for (const alias of aliases) {
        const v = flat[alias] ?? flat[alias.replace(/_/g, "-")];
        if (v !== undefined && v !== "") { entityData[crmField] = String(v); break; }
      }
    });

    let entityId = null;
    const entityType = webhook.entity;

    try {
      if (webhook.entity === "lead") {
        // Build a sensible title
        if (!entityData.title) {
          const formName = rawPayload.form_title || rawPayload.form_name || webhook.name;
          const contactName = entityData.name || "";
          entityData.title = contactName ? `${formName} - ${contactName}` : formName;
        }
        entityData.source   = entityData.source   || "Website";
        entityData.stage    = entityData.stage    || "Fresh Leads";
        entityData.status   = entityData.status   || "active";
        entityData.responsible = entityData.responsible || "Govind Kaushik";
        entityData.priority = entityData.priority || "medium";
        entityData.currency = entityData.currency || "USD";
        entityData.amount   = Number(entityData.amount) || 0;

        const lead = db.insert("leads", entityData);
        entityId = lead.id;

      } else if (webhook.entity === "contact") {
        entityData.status = entityData.status || "active";
        const contact = db.insert("contacts", entityData);
        entityId = contact.id;

      } else if (webhook.entity === "task") {
        if (!entityData.title && entityData.name) entityData.title = entityData.name;
        if (!entityData.title) entityData.title = webhook.name || "Webhook Task";
        entityData.status = entityData.status || "pending";
        const task = db.insert("tasks", entityData);
        entityId = task.id;
      }
    } catch (insertErr) {
      db.insert("webhook_logs", {
        webhook_id: webhook.id, source_ip: req.ip, method: req.method,
        payload: rawPayload, status: "error", result: { error: insertErr.message },
      });
      return res.json({ success: false, error: "Failed to create entity: " + insertErr.message });
    }

    // Update trigger count
    db.update("webhooks", webhook.id, {
      trigger_count: (webhook.trigger_count || 0) + 1,
      last_triggered: new Date().toISOString(),
    });

    // Log success
    db.insert("webhook_logs", {
      webhook_id: webhook.id, source_ip: req.ip, method: req.method,
      payload: rawPayload, status: "success",
      result: { entity_type: entityType, entity_id: entityId },
    });

    // If a redirect_url is configured on the webhook (or sent in the payload), redirect the browser
    const redirectUrl = webhook.redirect_url || rawPayload.redirect_url;
    if (redirectUrl && req.headers.accept && req.headers.accept.includes("text/html")) {
      return res.redirect(redirectUrl);
    }

    res.json({
      success: true,
      data: { message: `${entityType} created successfully`, entity_id: entityId, entity_type: entityType },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Public GET receiver (for form GET submissions) ─────────────────────────
router.get("/receive/:token", (req, res) => {
  try {
    const webhooks = db.getCollection("webhooks");
    const webhook = webhooks.find(w => w.token === req.params.token && w.type === "inbound" && w.status === "active");
    if (!webhook) return res.status(404).json({ success: false, error: "Webhook not found or inactive" });
    // Use query params as payload
    req.body = req.query;
    // Reuse POST logic by calling it internally
    const payload = req.query;
    const mapping = webhook.field_mapping || {};
    const entityData = {};
    Object.entries(mapping).forEach(([formField, crmField]) => {
      if (payload[formField] !== undefined) entityData[crmField] = payload[formField];
    });
    if (webhook.entity === "lead") {
      if (!entityData.title && entityData.name) entityData.title = `Webhook Lead - ${entityData.name}`;
      if (!entityData.title) entityData.title = "Webhook Lead";
      if (!entityData.source) entityData.source = "Webhook";
      if (!entityData.stage) entityData.stage = "Fresh Leads";
      if (!entityData.status) entityData.status = "active";
      const lead = db.insert("leads", entityData);
      db.insert("webhook_logs", { webhook_id: webhook.id, source_ip: req.ip, method: "GET", payload, status: "success", result: { entity_type: "lead", entity_id: lead.id } });
      res.json({ success: true, data: { message: "Lead created", entity_id: lead.id } });
    } else {
      res.json({ success: true, data: { message: "Webhook received" } });
    }
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
