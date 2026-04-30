const express = require("express");
const router  = express.Router();
const db      = require("../database");
const { authMiddleware } = require("./auth");

// ── Seed default workflow templates if none exist ─────────────────────────────
function seedDefaults() {
  const existing = db.getCollection("workflows");
  if (existing.length > 0) return;
  const defaults = [
    { name: "OSBK-Leave Approval",  category: "HR",      icon: "beach_access",  description: "Submit and track leave requests with automatic supervisor approval routing.", active: true, show_in_feed: true,  steps: JSON.stringify(["Submitted","Manager Approval","HR Review","Approved/Rejected"]) },
    { name: "Leave Approval",        category: "HR",      icon: "assignment",    description: "Standard leave approval process for all departments.",                        active: true, show_in_feed: false, steps: JSON.stringify(["Submitted","Manager Approval","HR Confirmation","Done"]) },
    { name: "Business Trip",         category: "Finance", icon: "flight",        description: "Business trip request, approval, and expense reimbursement flow.",            active: true, show_in_feed: true,  steps: JSON.stringify(["Submitted","Line Manager","Finance Approval","Booking","Completed"]) },
    { name: "General Requests",      category: "Admin",   icon: "card_giftcard", description: "General purpose request workflow for miscellaneous approvals.",               active: true, show_in_feed: true,  steps: JSON.stringify(["Submitted","Review","Approved/Rejected"]) },
    { name: "Purchase Request",      category: "Finance", icon: "shopping_cart", description: "Purchase request workflow with multi-level approval chain.",                  active: true, show_in_feed: true,  steps: JSON.stringify(["Submitted","Department Head","Finance Review","Procurement","Completed"]) },
    { name: "Expense Report",        category: "Finance", icon: "receipt_long",  description: "Expense report submission and reimbursement approval workflow.",              active: true, show_in_feed: true,  steps: JSON.stringify(["Submitted","Manager Approval","Finance Processing","Reimbursed"]) },
  ];
  defaults.forEach(w => db.insert("workflows", { ...w, runs_total: 0 }));
}
seedDefaults();

// ── Workflow templates ────────────────────────────────────────────────────────
// GET /api/workflows
router.get("/", (req, res) => {
  try {
    const { category, active, search } = req.query;
    let list = db.getCollection("workflows");
    if (category) list = list.filter(w => w.category === category);
    if (active !== undefined) list = list.filter(w => w.active === (active === "true"));
    if (search) list = list.filter(w => w.name.toLowerCase().includes(search.toLowerCase()));
    res.json({ success: true, data: list });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/workflows  — create new template
router.post("/", authMiddleware, (req, res) => {
  try {
    const { name, category = "General", description = "", steps = "[]", icon = "settings", show_in_feed = true } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "name required" });
    const w = db.insert("workflows", { name, category, description, icon, show_in_feed, active: true, runs_total: 0, steps: JSON.stringify(steps) });
    res.status(201).json({ success: true, data: w });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PUT /api/workflows/:id
router.put("/:id", authMiddleware, (req, res) => {
  try {
    const { steps, ...rest } = req.body;
    const updates = { ...rest };
    if (steps !== undefined) updates.steps = JSON.stringify(steps);
    const updated = db.update("workflows", req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE /api/workflows/:id
router.delete("/:id", authMiddleware, (req, res) => {
  try {
    db.delete("workflows", req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── Workflow Runs ─────────────────────────────────────────────────────────────
// GET /api/workflows/runs
router.get("/runs", authMiddleware, (req, res) => {
  try {
    const { workflow_id, status, initiated_by, mine } = req.query;
    let runs = db.getCollection("workflow_runs");
    if (workflow_id)  runs = runs.filter(r => r.workflow_id === workflow_id);
    if (status)       runs = runs.filter(r => r.status === status);
    if (initiated_by) runs = runs.filter(r => r.initiated_by === initiated_by);
    if (mine === "1") runs = runs.filter(r => r.initiated_by_id === req.user?.id || r.initiated_by === req.user?.name);
    runs = runs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    // Enrich with workflow name
    const wfMap = {};
    db.getCollection("workflows").forEach(w => { wfMap[w.id] = w; });
    runs = runs.map(r => ({ ...r, workflow_name: wfMap[r.workflow_id]?.name || r.workflow_name || "—", workflow_icon: wfMap[r.workflow_id]?.icon || "" }));
    res.json({ success: true, data: runs });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/workflows/:id/run  — start a workflow
router.post("/:id/run", authMiddleware, (req, res) => {
  try {
    const wf = db.getById("workflows", req.params.id);
    if (!wf) return res.status(404).json({ success: false, error: "Workflow not found" });
    const steps = JSON.parse(wf.steps || "[]");
    const { form_data = {} } = req.body;
    const run = db.insert("workflow_runs", {
      workflow_id:      wf.id,
      workflow_name:    wf.name,
      workflow_icon:    wf.icon,
      initiated_by:     req.user?.name || "Unknown",
      initiated_by_id:  req.user?.id   || "",
      status:           "In Progress",
      current_step:     steps[1] || steps[0] || "Processing",
      current_step_idx: 1,
      steps:            wf.steps,
      form_data:        JSON.stringify(form_data),
      history:          JSON.stringify([{ step: steps[0] || "Submitted", action: "submitted", by: req.user?.name || "Unknown", at: new Date().toISOString() }]),
    });
    // Increment runs_total on the workflow template
    db.update("workflows", wf.id, { runs_total: (wf.runs_total || 0) + 1 });
    // Notification
    db.insert("notifications", { type: "workflow_started", message: `Workflow "${wf.name}" started by ${req.user?.name}`, entity_type: "workflow", entity_id: run.id, user: req.user?.name, read: false });
    res.status(201).json({ success: true, data: run });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PATCH /api/workflows/runs/:runId/advance — advance to next step
router.patch("/runs/:runId/advance", authMiddleware, (req, res) => {
  try {
    const run = db.getById("workflow_runs", req.params.runId);
    if (!run) return res.status(404).json({ success: false, error: "Run not found" });
    const steps = JSON.parse(run.steps || "[]");
    const history = JSON.parse(run.history || "[]");
    const { action = "approved", comment = "" } = req.body;
    const nextIdx = (run.current_step_idx || 0) + 1;
    const isLast = nextIdx >= steps.length;
    history.push({ step: run.current_step, action, by: req.user?.name || "Unknown", comment, at: new Date().toISOString() });
    const updates = {
      current_step:     isLast ? steps[steps.length - 1] : steps[nextIdx],
      current_step_idx: nextIdx,
      status:           isLast ? (action === "rejected" ? "Rejected" : "Completed") : "In Progress",
      history:          JSON.stringify(history),
    };
    if (isLast) updates.completed_at = new Date().toISOString();
    const updated = db.update("workflow_runs", run.id, updates);
    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PATCH /api/workflows/runs/:runId/cancel
router.patch("/runs/:runId/cancel", authMiddleware, (req, res) => {
  try {
    const run = db.getById("workflow_runs", req.params.runId);
    if (!run) return res.status(404).json({ success: false, error: "Not found" });
    const history = JSON.parse(run.history || "[]");
    history.push({ step: run.current_step, action: "cancelled", by: req.user?.name || "Unknown", at: new Date().toISOString() });
    const updated = db.update("workflow_runs", run.id, { status: "Cancelled", history: JSON.stringify(history) });
    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/workflows/runs/:runId  — single run detail
router.get("/runs/:runId", authMiddleware, (req, res) => {
  try {
    const run = db.getById("workflow_runs", req.params.runId);
    if (!run) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: { ...run, history: JSON.parse(run.history || "[]"), steps: JSON.parse(run.steps || "[]"), form_data: JSON.parse(run.form_data || "{}") } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
