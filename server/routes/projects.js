/* eslint-disable */
const express = require("express");
const router = express.Router();
const db = require("../database");
const { authMiddleware } = require("./auth");

// ── PROJECTS (Groups) ──────────────────────────────────────────────────────

// GET all projects
router.get("/", authMiddleware, (req, res) => {
  try {
    const { search } = req.query;
    let projects = db.getCollection("projects");
    if (search) {
      const q = search.toLowerCase();
      projects = projects.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.group_id || "").toString().includes(q)
      );
    }
    projects = projects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ success: true, data: projects });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// GET single project
router.get("/:id", authMiddleware, (req, res) => {
  try {
    const project = db.getById("projects", req.params.id);
    if (!project) return res.json({ success: false, error: "Project not found" });
    // Get rules for this project
    const rules = db.getCollection("project_rules").filter(r => r.project_id === req.params.id);
    res.json({ success: true, data: { ...project, rules } });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// POST create project
router.post("/", authMiddleware, (req, res) => {
  try {
    const { name, group_id, description, client_name, client_email, assigned_to, status } = req.body;
    if (!name) return res.json({ success: false, error: "Project name is required" });

    // Auto-generate group_id if not provided
    const existingProjects = db.getCollection("projects");
    const nextId = existingProjects.length > 0
      ? Math.max(...existingProjects.map(p => parseInt(p.group_id) || 0)) + 1
      : 1;

    const project = db.insert("projects", {
      name,
      group_id: group_id || nextId,
      description: description || "",
      client_name: client_name || "",
      client_email: client_email || "",
      assigned_to: assigned_to || "",
      status: status || "active",
      rules_count: 0,
      created_by: req.user?.name || "Admin",
    });
    res.json({ success: true, data: project });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// PUT update project
router.put("/:id", authMiddleware, (req, res) => {
  try {
    const updated = db.update("projects", req.params.id, req.body);
    if (!updated) return res.json({ success: false, error: "Project not found" });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// DELETE project
router.delete("/:id", authMiddleware, (req, res) => {
  try {
    db.delete("projects", req.params.id);
    // Also delete all rules for this project
    const rules = db.getCollection("project_rules");
    const toDelete = rules.filter(r => r.project_id === req.params.id).map(r => r.id);
    if (toDelete.length) db.deleteMany("project_rules", toDelete);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── PROJECT RULES ──────────────────────────────────────────────────────────

// GET all rules
router.get("/rules/all", authMiddleware, (req, res) => {
  try {
    const { project_id, search } = req.query;
    let rules = db.getCollection("project_rules");
    if (project_id) rules = rules.filter(r => r.project_id === project_id);
    if (search) {
      const q = search.toLowerCase();
      rules = rules.filter(r =>
        (r.from_email || "").toLowerCase().includes(q) ||
        (r.to_email || "").toLowerCase().includes(q) ||
        (r.project_name || "").toLowerCase().includes(q)
      );
    }
    // Enrich with project info
    const projects = db.getCollection("projects");
    rules = rules.map(r => {
      const project = projects.find(p => p.id === r.project_id);
      return { ...r, project_name: project?.name || r.project_name, group_id: project?.group_id || r.group_id };
    });
    rules = rules.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ success: true, data: rules });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// POST create rule
router.post("/rules", authMiddleware, (req, res) => {
  try {
    const { from_email, to_email, project_id, project_name, group_id, condition, action } = req.body;
    if (!from_email) return res.json({ success: false, error: "From email is required" });
    if (!project_id) return res.json({ success: false, error: "Project is required" });

    // Get project details
    const project = db.getById("projects", project_id);

    const rule = db.insert("project_rules", {
      from_email: from_email.trim().toLowerCase(),
      to_email: (to_email || "").trim().toLowerCase(),
      project_id,
      project_name: project?.name || project_name || "",
      group_id: project?.group_id || group_id || "",
      condition: condition || "from",
      action: action || "assign_to_project",
      status: "active",
      published: false,
      match_count: 0,
      created_by: req.user?.name || "Admin",
    });

    // Update project rules count
    if (project) {
      const rulesCount = db.getCollection("project_rules").filter(r => r.project_id === project_id).length;
      db.update("projects", project_id, { rules_count: rulesCount });
    }

    res.json({ success: true, data: rule });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// PUT update rule
router.put("/rules/:id", authMiddleware, (req, res) => {
  try {
    const { from_email, to_email, project_id } = req.body;
    const project = project_id ? db.getById("projects", project_id) : null;
    const updated = db.update("project_rules", req.params.id, {
      ...req.body,
      from_email: from_email ? from_email.trim().toLowerCase() : undefined,
      to_email: to_email ? to_email.trim().toLowerCase() : undefined,
      project_name: project?.name || req.body.project_name,
      group_id: project?.group_id || req.body.group_id,
    });
    if (!updated) return res.json({ success: false, error: "Rule not found" });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// DELETE rule
router.delete("/rules/:id", authMiddleware, (req, res) => {
  try {
    const rule = db.getById("project_rules", req.params.id);
    db.delete("project_rules", req.params.id);
    // Update project count
    if (rule?.project_id) {
      const rulesCount = db.getCollection("project_rules").filter(r => r.project_id === rule.project_id).length;
      db.update("projects", rule.project_id, { rules_count: rulesCount });
    }
    res.json({ success: true, data: { deleted: true } });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// POST publish rules — marks all rules as published/active
router.post("/rules/publish", authMiddleware, (req, res) => {
  try {
    const rules = db.getCollection("project_rules");
    let published = 0;
    rules.forEach(r => {
      if (!r.published) {
        db.update("project_rules", r.id, { published: true, published_at: new Date().toISOString() });
        published++;
      }
    });
    res.json({ success: true, data: { published, total: rules.length, message: `${published} rules published successfully` } });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// POST match rule — check if an email matches any rule (used by Mail module)
router.post("/rules/match", authMiddleware, (req, res) => {
  try {
    const { from_email, to_email } = req.body;
    if (!from_email) return res.json({ success: false, error: "from_email required" });

    const rules = db.getCollection("project_rules").filter(r => r.status === "active");
    const from = from_email.trim().toLowerCase();
    const to = (to_email || "").trim().toLowerCase();

    // Find matching rule — exact match first, then domain match
    let matched = rules.find(r => r.from_email === from);
    if (!matched && to) matched = rules.find(r => r.to_email && r.to_email === to);
    if (!matched) {
      // Domain match (e.g. rule from_email = "@crownws.com" matches any @crownws.com)
      matched = rules.find(r => r.from_email.startsWith("@") && from.endsWith(r.from_email));
    }

    if (matched) {
      // Increment match count
      db.update("project_rules", matched.id, { match_count: (matched.match_count || 0) + 1 });
      const project = db.getById("projects", matched.project_id);
      res.json({ success: true, data: { matched: true, rule: matched, project } });
    } else {
      res.json({ success: true, data: { matched: false } });
    }
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// GET rules stats
router.get("/rules/stats", authMiddleware, (req, res) => {
  try {
    const rules = db.getCollection("project_rules");
    const projects = db.getCollection("projects");
    res.json({
      success: true,
      data: {
        total_rules: rules.length,
        published_rules: rules.filter(r => r.published).length,
        active_rules: rules.filter(r => r.status === "active").length,
        total_projects: projects.length,
        active_projects: projects.filter(p => p.status === "active").length,
        total_matches: rules.reduce((s, r) => s + (r.match_count || 0), 0),
      }
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

module.exports = router;
