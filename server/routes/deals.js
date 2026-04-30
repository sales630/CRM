const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../database");

router.get("/stats/summary", (req, res) => {
  try {
    const deals = db.getCollection("deals");
    const total = deals.length;
    const totalAmount = deals.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const wonAmount = deals
      .filter((d) => d.stage === "Won")
      .reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const pipeline = deals
      .filter((d) => !["Won", "Lost"].includes(d.stage))
      .reduce((s, d) => s + ((Number(d.amount) || 0) * (Number(d.probability) || 0)) / 100, 0);
    const byStage = {};
    deals.forEach((d) => {
      byStage[d.stage] = byStage[d.stage] || { stage: d.stage, count: 0, total: 0 };
      byStage[d.stage].count++;
      byStage[d.stage].total += Number(d.amount) || 0;
    });
    res.json({
      success: true,
      data: { total, totalAmount, wonAmount, pipeline, byStage: Object.values(byStage) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/", (req, res) => {
  try {
    const { stage, status, search } = req.query;
    let deals = db.getCollection("deals");
    if (stage) deals = deals.filter((d) => d.stage === stage);
    if (status) deals = deals.filter((d) => d.status === status);
    if (search) {
      const t = search.toLowerCase();
      deals = deals.filter((d) =>
        ["title", "contact_name", "company_name"].some((f) =>
          (d[f] || "").toLowerCase().includes(t)
        )
      );
    }
    deals = deals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ success: true, data: deals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id", (req, res) => {
  try {
    const deal = db.getById("deals", req.params.id);
    if (!deal) return res.status(404).json({ success: false, error: "Deal not found" });
    const activities = db.find("activities", { entity_type: "deal", entity_id: req.params.id });
    const comments = db.find("comments", { entity_type: "deal", entity_id: req.params.id });
    res.json({ success: true, data: { ...deal, activities, comments } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", (req, res) => {
  try {
    const {
      title,
      contact_name = "",
      company_name = "",
      phone = "",
      email = "",
      amount = 0,
      stage = "New Opportunity",
      source = "Website",
      responsible = "Govind Kaushik",
      notes = "",
      close_date = null,
      probability = 20,
      priority = "medium",
    } = req.body;
    if (!title) return res.status(400).json({ success: false, error: "Title is required" });
    const deal = db.insert("deals", {
      title,
      contact_name,
      company_name,
      phone,
      email,
      amount,
      stage,
      source,
      responsible,
      notes,
      close_date,
      probability,
      priority,
      status: "active",
    });
    res.status(201).json({ success: true, data: deal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:id", (req, res) => {
  try {
    const fields = [
      "title",
      "contact_name",
      "company_name",
      "phone",
      "email",
      "amount",
      "stage",
      "source",
      "status",
      "responsible",
      "notes",
      "close_date",
      "probability",
      "priority",
    ];
    const updates = {};
    fields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    const updated = db.update("deals", req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, error: "Deal not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/:id/stage", (req, res) => {
  try {
    const { stage } = req.body;
    if (!stage) return res.status(400).json({ success: false, error: "Stage required" });
    const updated = db.update("deals", req.params.id, { stage });
    if (!updated) return res.status(404).json({ success: false, error: "Deal not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    db.delete("deals", req.params.id);
    db.deleteWhere("activities", { entity_type: "deal", entity_id: req.params.id });
    res.json({ success: true, message: "Deal deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
