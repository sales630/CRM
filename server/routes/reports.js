const express = require("express");
const router = express.Router();
const db = require("../database");
const { authMiddleware } = require("./auth");

// ── Work Summary Report ────────────────────────────────────────────────────
router.get("/work-summary", authMiddleware, (req, res) => {
  try {
    const { from, to, user } = req.query;
    const tasks = db.getCollection("tasks");
    const timeLogs = db.getCollection("time_logs");
    const users = db.getCollection("users");

    let filteredTasks = tasks;
    if (from) {
      filteredTasks = filteredTasks.filter((t) => {
        const dateToCheck = t.created_at || t.due_date || t.start_date;
        if (!dateToCheck) return true; // include tasks with no date
        return dateToCheck >= from;
      });
    }
    if (to) {
      filteredTasks = filteredTasks.filter((t) => {
        const dateToCheck = t.created_at || t.due_date || t.start_date;
        if (!dateToCheck) return true; // include tasks with no date
        return dateToCheck <= to + "T23:59:59";
      });
    }
    if (user) filteredTasks = filteredTasks.filter((t) => t.assigned_to === user);

    // Build per-user summary
    const byUser = {};
    filteredTasks.forEach((t) => {
      const a = t.assigned_to || "Unassigned";
      if (!byUser[a]) {
        const u = users.find((u) => u.name === a) || {};
        byUser[a] = {
          name: a,
          role: u.role || "employee",
          department: u.department || "",
          tasks_completed: 0,
          tasks_in_progress: 0,
          tasks_pending: 0,
          tasks_total: 0,
          hours_logged: 0,
          completion_rate: 0,
        };
      }
      byUser[a].tasks_total++;
      if (t.status === "completed") byUser[a].tasks_completed++;
      else if (t.status === "in_progress") byUser[a].tasks_in_progress++;
      else byUser[a].tasks_pending++;
    });

    // Helper: get minutes for a task — time_logs first, fall back to task_duration_minutes
    const getTaskMinutes = (t) => {
      const logMins = timeLogs
        .filter((l) => l.task_id === t.id)
        .reduce((s, l) => s + Number(l.duration_minutes || 0), 0);
      return logMins > 0 ? logMins : Number(t.task_duration_minutes || 0);
    };

    // Add hours per user — covers both manual time_logs and timer-based task_duration_minutes
    filteredTasks.forEach((t) => {
      const a = t.assigned_to || "Unassigned";
      if (!byUser[a]) return;
      byUser[a].hours_logged += getTaskMinutes(t) / 60;
    });

    // Compute completion rates
    Object.values(byUser).forEach((u) => {
      u.completion_rate =
        u.tasks_total > 0 ? Math.round((u.tasks_completed / u.tasks_total) * 100) : 0;
      u.hours_logged = Math.round(u.hours_logged * 10) / 10;
    });

    // Totals
    const allUsers = Object.values(byUser);
    const totalMinutes = filteredTasks.reduce((s, t) => s + getTaskMinutes(t), 0);
    const totals = {
      tasks_total: filteredTasks.length,
      tasks_completed: filteredTasks.filter((t) => t.status === "completed").length,
      tasks_in_progress: filteredTasks.filter((t) => t.status === "in_progress").length,
      hours_logged: Math.round((totalMinutes / 60) * 10) / 10,
      completion_rate:
        filteredTasks.length > 0
          ? Math.round(
              (filteredTasks.filter((t) => t.status === "completed").length /
                filteredTasks.length) *
                100
            )
          : 0,
    };

    // Task breakdown — normalise due_date (tasks from email use `deadline` field)
    const now = new Date();
    const taskBreakdown = filteredTasks.map((t) => {
      const dueDate = t.due_date || t.deadline || null;
      const hours = getTaskMinutes(t) / 60;
      return {
        id: t.id,
        title: t.title,
        assigned_to: t.assigned_to,
        priority: t.priority,
        status: t.status,
        due_date: dueDate,
        completed_at: t.completed_at || null,
        started_at: t.started_at || null,
        client_name: t.client_name || t.client || null,
        hours_logged: Math.round(hours * 10) / 10,
        task_duration_minutes: Number(t.task_duration_minutes || 0),
        overdue: dueDate && t.status !== "completed" && new Date(dueDate) < now,
      };
    });

    res.json({
      success: true,
      data: {
        period: { from, to },
        totals,
        users: allUsers,
        task_breakdown: taskBreakdown,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Scheduled Reports ──────────────────────────────────────────────────────
router.get("/scheduled", authMiddleware, (req, res) => {
  try {
    const reports = db.getCollection("scheduled_reports").map((r) => ({
      ...r,
      recipients: (() => {
        if (Array.isArray(r.recipients)) return r.recipients;
        try {
          return JSON.parse(r.recipients || "[]");
        } catch {
          return [];
        }
      })(),
    }));
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/scheduled", authMiddleware, (req, res) => {
  try {
    const { name, frequency, recipients, report_type, enabled } = req.body;
    const report = db.insert("scheduled_reports", {
      name: name || "Scheduled Report",
      frequency: frequency || "weekly",
      recipients: JSON.stringify(Array.isArray(recipients) ? recipients : []),
      report_type: report_type || "work_summary",
      enabled: enabled !== false,
      last_sent: null,
    });
    res.status(201).json({
      success: true,
      data: { ...report, recipients: Array.isArray(recipients) ? recipients : [] },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/scheduled/:id", authMiddleware, (req, res) => {
  try {
    const { recipients, ...rest } = req.body;
    const updates = { ...rest };
    if (recipients !== undefined)
      updates.recipients = JSON.stringify(Array.isArray(recipients) ? recipients : []);
    const updated = db.update("scheduled_reports", req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, error: "Not found" });
    res.json({
      success: true,
      data: {
        ...updated,
        recipients: (() => {
          try {
            return JSON.parse(updated.recipients || "[]");
          } catch {
            return [];
          }
        })(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/scheduled/:id", authMiddleware, (req, res) => {
  try {
    db.delete("scheduled_reports", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── CRM Overview Report ────────────────────────────────────────────────────
router.get("/crm-overview", authMiddleware, (req, res) => {
  try {
    const leads = db.getCollection("leads");
    const deals = db.getCollection("deals");
    const invoices = db.getCollection("invoices");
    const contacts = db.getCollection("contacts");
    const companies = db.getCollection("companies");
    const tasks = db.getCollection("tasks");

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();

    // Lead breakdowns
    const newLeads = leads.filter((l) => l.created_at >= thirtyDaysAgo).length;
    const qualifiedLeads = leads.filter((l) => l.stage === "Qualified" || l.stage === "SQL").length;
    const convertedLeads = leads.filter((l) => l.stage === "Converted" || l.stage === "Won").length;

    // Deal breakdowns
    const wonDeals = deals.filter((d) => d.stage === "Won" || d.status === "won");
    const lostDeals = deals.filter((d) => d.stage === "Lost" || d.status === "lost");
    const dealRevenue = wonDeals.reduce((s, d) => s + Number(d.amount || d.value || 0), 0);

    // Invoice breakdowns
    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const overdueInvoices = invoices.filter((i) => i.status === "overdue");
    const paidAmount = paidInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
    const outstanding = invoices
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((s, i) => s + Number(i.total || 0), 0);

    // Task breakdowns
    const overdueTasks = tasks.filter(
      (t) => t.due_date && t.status !== "completed" && new Date(t.due_date) < now
    ).length;

    res.json({
      success: true,
      data: {
        leads: {
          total: leads.length,
          new: newLeads,
          qualified: qualifiedLeads,
          converted: convertedLeads,
        },
        deals: {
          total: deals.length,
          won: wonDeals.length,
          lost: lostDeals.length,
          revenue: dealRevenue,
        },
        invoices: {
          total: invoices.length,
          paid_amount: paidAmount,
          total_invoiced: totalInvoiced,
          outstanding,
          overdue_count: overdueInvoices.length,
        },
        contacts: { total: contacts.length },
        companies: { total: companies.length },
        tasks: {
          total: tasks.length,
          completed: tasks.filter((t) => t.status === "completed").length,
          in_progress: tasks.filter((t) => t.status === "in_progress").length,
          overdue: overdueTasks,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
