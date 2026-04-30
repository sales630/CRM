const express = require("express");
const router = express.Router();
const db = require("../database");

router.get("/", (req, res) => {
  try {
    const { category, search, active } = req.query;
    let products = db.getCollection("products");
    if (category) products = products.filter((p) => p.category === category);
    if (active !== undefined) products = products.filter((p) => p.active === (active === "true"));
    if (search) {
      const t = search.toLowerCase();
      products = products.filter((p) =>
        ["name", "description", "sku", "category"].some((f) =>
          (p[f] || "").toLowerCase().includes(t)
        )
      );
    }
    products = products.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id", (req, res) => {
  try {
    const p = db.getById("products", req.params.id);
    if (!p) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: p });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", (req, res) => {
  try {
    const {
      name,
      description = "",
      category = "General",
      price = 0,
      currency = "USD",
      tax_rate = 0,
      unit = "month",
      sku = "",
      active = true,
    } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Name required" });
    const p = db.insert("products", {
      name,
      description,
      category,
      price,
      currency,
      tax_rate,
      unit,
      sku,
      active,
    });
    res.status(201).json({ success: true, data: p });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:id", (req, res) => {
  try {
    const fields = [
      "name",
      "description",
      "category",
      "price",
      "currency",
      "tax_rate",
      "unit",
      "sku",
      "active",
    ];
    const updates = {};
    fields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    const updated = db.update("products", req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    db.delete("products", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
