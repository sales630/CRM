const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../database");

router.get("/", (req, res) => {
  try {
    const { entity_type, entity_id, type, completed } = req.query;
    let acts = db.getCollection("activities");
    if (entity_type) acts = acts.filter((a) => a.entity_type === entity_type);
    if (entity_id) acts = acts.filter((a) => a.entity_id === entity_id);
    if (type) acts = acts.filter((a) => a.type === type);
    if (completed !== undefined) acts = acts.filter((a) => a.completed === (completed === "true"));
    acts = acts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ success: true, data: acts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", (req, res) => {
  try {
    const {
      type,
      title,
      description = "",
      entity_type = "general",
      entity_id = "",
      assigned_to = "",
      due_date = null,
      due_time = null,
      direction = "outgoing",
      duration = null,
      color = null,
    } = req.body;
    if (!type || !title)
      return res
        .status(400)
        .json({ success: false, error: "type and title are required" });
    const act = db.insert("activities", {
      type,
      title,
      description,
      entity_type,
      entity_id,
      assigned_to,
      due_date,
      due_time,
      direction,
      duration,
      color,
      completed: false,
    });
    res.status(201).json({ success: true, data: act });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:id", (req, res) => {
  try {
    const {
      type,
      title,
      description,
      entity_type,
      entity_id,
      assigned_to,
      due_date,
      due_time,
      direction,
      duration,
      completed,
    } = req.body;
    const updates = {};
    if (type !== undefined) updates.type = type;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (entity_type !== undefined) updates.entity_type = entity_type;
    if (entity_id !== undefined) updates.entity_id = entity_id;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (due_date !== undefined) updates.due_date = due_date;
    if (due_time !== undefined) updates.due_time = due_time;
    if (direction !== undefined) updates.direction = direction;
    if (duration !== undefined) updates.duration = duration;
    if (completed !== undefined) updates.completed = completed;
    const updated = db.update("activities", req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, error: "Activity not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/:id/complete", (req, res) => {
  try {
    const updated = db.update("activities", req.params.id, { completed: true });
    if (!updated) return res.status(404).json({ success: false, error: "Activity not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/:id/uncomplete", (req, res) => {
  try {
    const updated = db.update("activities", req.params.id, { completed: false });
    if (!updated) return res.status(404).json({ success: false, error: "Activity not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    db.delete("activities", req.params.id);
    res.json({ success: true, message: "Activity deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/comments", (req, res) => {
  try {
    const { entity_type, entity_id, author = "Govind Kaushik", text } = req.body;
    if (!text || !entity_type || !entity_id)
      return res.status(400).json({ success: false, error: "Missing fields" });
    const comment = db.insert("comments", { entity_type, entity_id, author, text });
    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
