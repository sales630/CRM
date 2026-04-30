const express = require("express");
const router = express.Router();
const db = require("../database");

router.get("/", (req, res) => {
  try {
    const { status, search } = req.query;
    let quotes = db.getCollection("quotes");
    if (status) quotes = quotes.filter((q) => q.status === status);
    if (search) {
      const t = search.toLowerCase();
      quotes = quotes.filter((q) =>
        ["quote_number", "contact_name", "company_name"].some((f) =>
          (q[f] || "").toLowerCase().includes(t)
        )
      );
    }
    quotes = quotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    // Parse items JSON string to array for each quote
    quotes = quotes.map((q) => ({
      ...q,
      items: typeof q.items === "string" ? JSON.parse(q.items || "[]") : q.items || [],
    }));
    res.json({ success: true, data: quotes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id", (req, res) => {
  try {
    const q = db.getById("quotes", req.params.id);
    if (!q) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: { ...q, items: JSON.parse(q.items || "[]") } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", (req, res) => {
  try {
    const {
      contact_name = "",
      company_name = "",
      email = "",
      issue_date,
      valid_until,
      items = [],
      notes = "",
      discount = 0,
      tax = 0,
      responsible = "Govind Kaushik",
      deal_id = "",
    } = req.body;
    const subtotal = items.reduce(
      (s, i) => s + Number(i.price || 0) * Number(i.quantity || i.qty || 1),
      0
    );
    const taxTotal = items.reduce(
      (s, i) =>
        s +
        (Number(i.price || 0) * Number(i.quantity || i.qty || 1) * Number(i.tax_rate || 0)) / 100,
      0
    );
    const discountAmt = (subtotal * Number(discount)) / 100;
    const total = subtotal + taxTotal - discountAmt;
    const quote_number = db.nextNumber("quotes", "quote_number", "QT");
    const q = db.insert("quotes", {
      quote_number,
      contact_name,
      company_name,
      email,
      issue_date: issue_date || new Date().toISOString().split("T")[0],
      valid_until: valid_until || "",
      status: "draft",
      subtotal,
      tax,
      discount,
      total,
      currency: "USD",
      notes,
      items: JSON.stringify(items),
      responsible,
      deal_id,
    });
    res.status(201).json({ success: true, data: { ...q, items } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:id", (req, res) => {
  try {
    const { items, ...rest } = req.body;
    const updates = { ...rest };
    if (items !== undefined) {
      updates.items = JSON.stringify(items);
      const subtotal = items.reduce(
        (s, i) => s + Number(i.price || 0) * Number(i.quantity || i.qty || 1),
        0
      );
      const taxTotal = items.reduce(
        (s, i) =>
          s +
          (Number(i.price || 0) * Number(i.quantity || i.qty || 1) * Number(i.tax_rate || 0)) / 100,
        0
      );
      const discountAmt = (subtotal * Number(updates.discount || 0)) / 100;
      updates.subtotal = subtotal;
      updates.total = subtotal + taxTotal - discountAmt;
    }
    const updated = db.update("quotes", req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: { ...updated, items: JSON.parse(updated.items || "[]") } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/:id/status", (req, res) => {
  try {
    const { status } = req.body;
    const updated = db.update("quotes", req.params.id, { status });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    db.delete("quotes", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
