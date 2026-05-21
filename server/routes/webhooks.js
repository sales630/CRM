/**
 * Inbound Webhook Receiver
 * ─────────────────────────────────────────────────────────────────────────
 *  • POST /api/webhooks/whatsapp   ← WhatsApp leads (any provider)
 *  • GET  /api/webhooks/whatsapp   ← Meta Cloud-API verify handshake
 *  • POST /api/webhooks/lead       ← Generic JSON lead (any source)
 *
 *  Authentication (choose one — both are accepted):
 *   1. Header:  X-Webhook-Secret: <your secret>
 *   2. Query:   ?secret=<your secret>
 *   3. Meta Cloud-API GET handshake uses hub.verify_token (same secret).
 *
 *  Configure the secret with the env-var WEBHOOK_SECRET, otherwise the
 *  default "change-me-in-prod" is used (DO NOT ship that to production).
 *
 *  The route accepts three payload shapes and normalises them all into a
 *  single Lead record:
 *
 *  A) Generic JSON  (most BSPs — WATI / AiSensy / Interakt / Twilio / Zapier)
 *      { name, phone, email, message, source, company, country, amount }
 *
 *  B) Meta WhatsApp Cloud API
 *      { entry: [{ changes: [{ value: { messages: [...], contacts: [...] } }] }] }
 *
 *  C) Facebook / Instagram Lead Ads (Click-to-WhatsApp)
 *      { entry: [{ changes: [{ value: { field_data: [{ name, values }] } }] }] }
 */

const express = require("express");
const router  = express.Router();
const db      = require("../database");

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "change-me-in-prod";
const DEFAULT_RESPONSIBLE = process.env.WEBHOOK_DEFAULT_RESPONSIBLE || "Govind Kaushik";
const DEFAULT_STAGE       = "Fresh Leads";

// ── Auth helper ──────────────────────────────────────────────────────────
function checkSecret(req) {
  const headerSecret = req.headers["x-webhook-secret"] || req.headers["X-Webhook-Secret"];
  const querySecret  = req.query.secret;
  const provided = headerSecret || querySecret;
  return provided && String(provided) === String(WEBHOOK_SECRET);
}

// ── Normalise any payload shape into a Lead record ───────────────────────
function normaliseToLead(body, sourceHint = "WhatsApp") {
  // A) Generic flat JSON
  if (body && typeof body === "object" && (body.name || body.phone || body.email || body.message)) {
    return {
      name:    body.name    || body.full_name || body.contact_name || "",
      phone:   body.phone   || body.mobile    || body.whatsapp     || body.from || "",
      email:   body.email   || "",
      company: body.company || "",
      country: body.country || "",
      notes:   body.message || body.text      || body.body         || body.note || "",
      amount:  Number(body.amount) || 0,
      source:  body.source  || sourceHint,
      title:   body.title   || `${sourceHint} — ${body.name || body.phone || "New Lead"}`,
    };
  }

  // B) Meta WhatsApp Cloud API
  // entry[].changes[].value = { messages: [{ from, text:{body}, type, timestamp }], contacts: [{ profile:{ name }, wa_id }] }
  try {
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (value?.messages?.length) {
      const m = value.messages[0];
      const c = value.contacts?.[0] || {};
      const name  = c.profile?.name || "WhatsApp Lead";
      const phone = c.wa_id || m.from || "";
      const text  = m.text?.body || m.button?.text || m.interactive?.button_reply?.title || `[${m.type}]`;
      return {
        name, phone, email: "", company: "", country: "",
        notes:  text,
        amount: 0,
        source: "WhatsApp",
        title:  `WhatsApp — ${name}`,
      };
    }
  } catch (_) { /* fall through */ }

  // C) Facebook / Instagram Lead Ads
  try {
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (value?.field_data?.length) {
      const map = {};
      value.field_data.forEach(f => {
        const v = Array.isArray(f.values) ? f.values[0] : f.values;
        map[String(f.name).toLowerCase()] = v;
      });
      return {
        name:    map.full_name || map.name  || "",
        phone:   map.phone_number || map.phone || map.whatsapp || "",
        email:   map.email   || "",
        company: map.company || "",
        country: map.country || "",
        notes:   map.message || JSON.stringify(map),
        amount:  Number(map.amount) || 0,
        source:  "Facebook Lead Ad",
        title:   `Lead Ad — ${map.full_name || map.name || "Unknown"}`,
      };
    }
  } catch (_) { /* fall through */ }

  return null; // unrecognised payload
}

// ── Create the lead + log + notify ───────────────────────────────────────
function createLeadFromPayload(parsed) {
  const lead = db.insert("leads", {
    title:        parsed.title || `Lead — ${parsed.name || parsed.phone || "New"}`,
    name:         parsed.name    || "",
    phone:        parsed.phone   || "",
    email:        parsed.email   || "",
    amount:       parsed.amount  || 0,
    currency:     "USD",
    stage:        DEFAULT_STAGE,
    source:       parsed.source  || "WhatsApp",
    responsible:  DEFAULT_RESPONSIBLE,
    company:      parsed.company || "",
    notes:        parsed.notes   || "",
    priority:     "medium",
    status:       "active",
    country:      parsed.country || "",
    lead_for:     "",
    present_software: "",
    meeting_feedback: "",
    tags:         ["webhook", String(parsed.source || "whatsapp").toLowerCase()],
  });

  // Activity log
  try {
    db.insert("activities", {
      entity_type: "lead",
      entity_id:   lead.id,
      type:        "webhook",
      title:       `Lead received via webhook (${lead.source})`,
      description: lead.notes ? `Message: ${lead.notes.slice(0, 250)}` : "",
      created_by:  "Webhook",
    });
  } catch (_) { /* non-fatal */ }

  // Notification for the responsible user (and admins via target=all)
  try {
    db.insert("notifications", {
      type:        "lead_inbound",
      title:       `New ${lead.source} lead`,
      message:     `${lead.name || lead.phone || "New lead"} — ${lead.notes ? lead.notes.slice(0, 80) : "no message"}`,
      target:      lead.responsible,
      entity_type: "lead",
      entity_id:   lead.id,
      read:        false,
    });
  } catch (_) { /* non-fatal */ }

  return lead;
}

// ── GET /whatsapp — Meta Cloud-API webhook verify handshake ──────────────
// Meta calls: GET ...?hub.mode=subscribe&hub.verify_token=XXX&hub.challenge=YYY
router.get("/whatsapp", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === WEBHOOK_SECRET) {
    console.log("[Webhook] Meta verify handshake OK");
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ success: false, error: "Verify token mismatch" });
});

// ── POST /whatsapp — WhatsApp leads (any provider) ───────────────────────
router.post("/whatsapp", (req, res) => {
  if (!checkSecret(req)) {
    return res.status(401).json({ success: false, error: "Invalid or missing webhook secret" });
  }
  try {
    const parsed = normaliseToLead(req.body, "WhatsApp");
    if (!parsed) {
      console.warn("[Webhook] Unrecognised payload:", JSON.stringify(req.body).slice(0, 400));
      return res.status(400).json({ success: false, error: "Could not parse payload" });
    }
    const lead = createLeadFromPayload(parsed);
    console.log(`[Webhook] ✅ New ${lead.source} lead: ${lead.name || lead.phone} (id=${lead.id})`);
    return res.status(201).json({ success: true, data: { id: lead.id, name: lead.name, source: lead.source } });
  } catch (err) {
    console.error("[Webhook] Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /lead — Generic JSON lead (any source) ──────────────────────────
router.post("/lead", (req, res) => {
  if (!checkSecret(req)) {
    return res.status(401).json({ success: false, error: "Invalid or missing webhook secret" });
  }
  try {
    const parsed = normaliseToLead(req.body, req.body?.source || "Webhook");
    if (!parsed) return res.status(400).json({ success: false, error: "Empty or invalid payload" });
    const lead = createLeadFromPayload(parsed);
    console.log(`[Webhook] ✅ Generic lead: ${lead.name || lead.phone} (id=${lead.id})`);
    return res.status(201).json({ success: true, data: { id: lead.id, name: lead.name, source: lead.source } });
  } catch (err) {
    console.error("[Webhook] Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /ping — quick health check (no auth needed) ──────────────────────
router.get("/ping", (req, res) => {
  res.json({ success: true, message: "Webhook endpoint live", time: new Date().toISOString() });
});

module.exports = router;
