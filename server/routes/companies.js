const express = require("express");
const router = express.Router();
const db = require("../database");

router.get("/", (req, res) => {
  try {
    const { search } = req.query;
    let companies = db.getCollection("companies");
    if (search) {
      const t = search.toLowerCase();
      companies = companies.filter((c) =>
        ["name", "industry", "city", "country"].some((f) => (c[f] || "").toLowerCase().includes(t))
      );
    }
    companies = companies.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    res.json({ success: true, data: companies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id", (req, res) => {
  try {
    const company = db.getById("companies", req.params.id);
    if (!company) return res.status(404).json({ success: false, error: "Company not found" });
    const contacts = db.getCollection("contacts").filter((c) => c.company === company.name);
    const deals = db.getCollection("deals").filter((d) => d.company_name === company.name);
    res.json({ success: true, data: { ...company, contacts, deals } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", (req, res) => {
  try {
    const {
      name,
      phone = "",
      email = "",
      website = "",
      industry = "",
      employees = 0,
      revenue = 0,
      address = "",
      city = "",
      country = "",
      responsible = "Govind Kaushik",
      source = "Website",
      notes = "",
    } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Name is required" });
    const company = db.insert("companies", {
      name,
      phone,
      email,
      website,
      industry,
      employees,
      revenue,
      address,
      city,
      country,
      responsible,
      source,
      notes,
    });
    res.status(201).json({ success: true, data: company });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:id", (req, res) => {
  try {
    const fields = [
      "name",
      "phone",
      "email",
      "website",
      "industry",
      "employees",
      "revenue",
      "address",
      "city",
      "country",
      "responsible",
      "notes",
    ];
    const updates = {};
    fields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    const updated = db.update("companies", req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, error: "Company not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    db.delete("companies", req.params.id);
    res.json({ success: true, message: "Company deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
