const express = require("express");
const router = express.Router();
const db = require("../database");

router.get("/stats", (req, res) => {
  try {
    const invoices = db.getCollection("invoices");
    const total = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
    const paid = invoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + Number(i.total || 0), 0);
    const outstanding = invoices
      .filter((i) => ["sent", "overdue"].includes(i.status))
      .reduce((s, i) => s + Number(i.total || 0), 0);
    const overdue = invoices
      .filter((i) => i.status === "overdue")
      .reduce((s, i) => s + Number(i.total || 0), 0);
    const byStatus = {};
    invoices.forEach((i) => {
      byStatus[i.status] = byStatus[i.status] || { status: i.status, count: 0, total: 0 };
      byStatus[i.status].count++;
      byStatus[i.status].total += Number(i.total || 0);
    });
    res.json({
      success: true,
      data: {
        total,
        paid,
        outstanding,
        overdue,
        byStatus: Object.values(byStatus),
        count: invoices.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/", (req, res) => {
  try {
    const { status, search } = req.query;
    let invoices = db.getCollection("invoices");
    if (status) invoices = invoices.filter((i) => i.status === status);
    if (search) {
      const t = search.toLowerCase();
      invoices = invoices.filter((i) =>
        ["invoice_number", "contact_name", "company_name", "email"].some((f) =>
          (i[f] || "").toLowerCase().includes(t)
        )
      );
    }
    invoices = invoices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    // Parse items JSON string to array for each invoice
    invoices = invoices.map((inv) => ({
      ...inv,
      items: typeof inv.items === "string" ? JSON.parse(inv.items || "[]") : inv.items || [],
    }));
    res.json({ success: true, data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id", (req, res) => {
  try {
    const inv = db.getById("invoices", req.params.id);
    if (!inv) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: { ...inv, items: JSON.parse(inv.items || "[]") } });
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
      due_date,
      items = [],
      notes = "",
      discount = 0,
      tax = 0,
      responsible = "Govind Kaushik",
      deal_id = "",
    } = req.body;
    const subtotal = items.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 1), 0);
    const total = subtotal - Number(discount) + Number(tax);
    const invoice_number = db.nextNumber("invoices", "invoice_number", "INV");
    const inv = db.insert("invoices", {
      invoice_number,
      contact_name,
      company_name,
      email,
      issue_date: issue_date || new Date().toISOString().split("T")[0],
      due_date: due_date || "",
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
    res.status(201).json({ success: true, data: { ...inv, items } });
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
      updates.subtotal = items.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 1), 0);
      updates.total = updates.subtotal - Number(updates.discount || 0) + Number(updates.tax || 0);
    }
    const updated = db.update("invoices", req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: { ...updated, items: JSON.parse(updated.items || "[]") } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/:id/status", (req, res) => {
  try {
    const { status } = req.body;
    const updated = db.update("invoices", req.params.id, { status });
    if (!updated) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    db.delete("invoices", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
