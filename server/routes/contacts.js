const express = require("express");
const router = express.Router();
const db = require("../database");

router.get("/", (req, res) => {
  try {
    const { type, search } = req.query;
    let contacts = db.getCollection("contacts");
    if (type) contacts = contacts.filter((c) => c.type === type);
    if (search) {
      const t = search.toLowerCase();
      contacts = contacts.filter((c) =>
        ["name", "email", "phone", "company"].some((f) => (c[f] || "").toLowerCase().includes(t))
      );
    }
    contacts = contacts.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    res.json({ success: true, data: contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id", (req, res) => {
  try {
    const contact = db.getById("contacts", req.params.id);
    if (!contact) return res.status(404).json({ success: false, error: "Contact not found" });
    const activities = db.find("activities", { entity_type: "contact", entity_id: req.params.id });
    const comments = db.find("comments", { entity_type: "contact", entity_id: req.params.id });
    const deals = db.getCollection("deals").filter((d) => d.contact_name === contact.name);
    res.json({ success: true, data: { ...contact, activities, comments, deals } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", (req, res) => {
  try {
    const {
      name,
      first_name = "",
      last_name = "",
      phone = "",
      email = "",
      type = "Other",
      company = "",
      position = "",
      source = "Website",
      responsible = "Govind Kaushik",
      address = "",
      city = "",
      country = "",
      present_software = "",
      notes = "",
    } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Name is required" });
    const contact = db.insert("contacts", {
      name,
      first_name,
      last_name,
      phone,
      email,
      type,
      company,
      position,
      source,
      responsible,
      address,
      city,
      country,
      present_software,
      notes,
    });
    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:id", (req, res) => {
  try {
    const fields = [
      "name",
      "first_name",
      "last_name",
      "phone",
      "email",
      "type",
      "company",
      "position",
      "source",
      "responsible",
      "address",
      "city",
      "country",
      "present_software",
      "notes",
    ];
    const updates = {};
    fields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    const updated = db.update("contacts", req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, error: "Contact not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    db.delete("contacts", req.params.id);
    res.json({ success: true, message: "Contact deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
