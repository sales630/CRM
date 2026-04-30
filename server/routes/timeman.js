/* eslint-disable */
const express = require("express");
const router = express.Router();
const db = require("../database");
const { authMiddleware } = require("./auth");

// ── Helpers ────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function calcDuration(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  return Math.round((new Date(clockOut) - new Date(clockIn)) / 60000); // minutes
}
function formatDuration(minutes) {
  if (!minutes) return "0h 0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

// ── Clock In ───────────────────────────────────────────────────────────────
router.post("/clockin", authMiddleware, (req, res) => {
  try {
    const { user_name, department } = req.body;
    const user_id = req.user.id;
    const today = todayStr();

    // Block only if there is an ACTIVE (not yet clocked out) session — multiple sessions per day are allowed
    const activeSession = db.getCollection("timeman_records").find(
      (r) => r.user_id === user_id && r.date === today && !r.clock_out
    );
    if (activeSession) {
      return res.json({ success: false, error: "Already clocked in. Please clock out first." });
    }

    const record = db.insert("timeman_records", {
      user_id,
      user_name: user_name || req.user.name,
      department: department || req.user.department || "General",
      date: today,
      clock_in: new Date().toISOString(),
      clock_out: null,
      duration_minutes: 0,
      status: "active",
      breaks: [],
      notes: "",
    });

    res.json({ success: true, data: record });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── Clock Out ──────────────────────────────────────────────────────────────
router.post("/clockout", authMiddleware, (req, res) => {
  try {
    const { notes } = req.body;
    const user_id = req.user.id;
    const today = todayStr();

    const records = db.getCollection("timeman_records");
    const record = records.find(
      (r) => r.user_id === user_id && r.date === today && !r.clock_out
    );

    if (!record) {
      return res.json({ success: false, error: "No active clock-in found" });
    }

    const clockOut = new Date().toISOString();
    const duration = calcDuration(record.clock_in, clockOut);
    const updated = db.update("timeman_records", record.id, {
      clock_out: clockOut,
      duration_minutes: duration,
      status: "completed",
      notes: notes || "",
    });

    res.json({ success: true, data: updated });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── My Status ──────────────────────────────────────────────────────────────
router.get("/mystatus", authMiddleware, (req, res) => {
  try {
    const user_id = req.user.id;
    const today = todayStr();
    const todayRecords = db.getCollection("timeman_records").filter(
      (r) => r.user_id === user_id && r.date === today
    );
    // Always prefer the active (not clocked-out) record — handles multiple sessions per day
    const activeRecord = todayRecords.find((r) => !r.clock_out);
    const record = activeRecord || todayRecords[todayRecords.length - 1] || null;
    const isClockedIn = !!activeRecord;
    res.json({
      success: true,
      data: {
        is_clocked_in: isClockedIn,
        record: record || null,
        clock_in_time: activeRecord?.clock_in || null,
        clock_out_time: record?.clock_out || null,
        sessions_today: todayRecords.length,
      },
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── Online Users (currently clocked in today) ─────────────────────────────
router.get("/online", authMiddleware, (req, res) => {
  try {
    const today = todayStr();
    const activeRecords = db
      .getCollection("timeman_records")
      .filter((r) => r.date === today && !r.clock_out);
    res.json({
      success: true,
      data: activeRecords.map((r) => ({
        user_id: String(r.user_id),
        user_name: r.user_name,
        clock_in: r.clock_in,
      })),
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── Stats (clocked in count) ───────────────────────────────────────────────
router.get("/stats", authMiddleware, (req, res) => {
  try {
    const today = todayStr();
    const records = db.getCollection("timeman_records").filter((r) => r.date === today);
    const clockedIn = records.filter((r) => !r.clock_out).length;
    const clockedOut = records.filter((r) => !!r.clock_out).length;
    const totalMinutes = records.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);
    const users = db.getCollection("users");
    res.json({
      success: true,
      data: {
        clocked_in: clockedIn,
        clocked_out: clockedOut,
        total_employees: users.length,
        total_hours_today: formatDuration(totalMinutes),
        records,
      },
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── Time Report — daily aggregated records (user or all) ───────────────────
router.get("/time-report", authMiddleware, (req, res) => {
  try {
    const { start, end, user_id } = req.query;
    const isAdmin = ["admin", "super_admin"].includes(req.user.role);
    // Regular users can only see their own records
    const targetUserId = isAdmin ? (user_id || null) : req.user.id;

    let records = db.getCollection("timeman_records");
    if (start) records = records.filter((r) => r.date >= start);
    if (end)   records = records.filter((r) => r.date <= end);
    if (targetUserId) records = records.filter((r) => r.user_id === targetUserId);

    // Sort newest first
    records = records.sort((a, b) => b.date.localeCompare(a.date) || b.clock_in.localeCompare(a.clock_in));

    // Build daily summary map
    const dayMap = {};
    for (const r of records) {
      if (!dayMap[r.date]) dayMap[r.date] = { date: r.date, sessions: [], total_minutes: 0 };
      dayMap[r.date].sessions.push(r);
      dayMap[r.date].total_minutes += r.duration_minutes || 0;
    }

    // Per-user summary (for admin "all users" view)
    const users = db.getCollection("users");
    const userMap = {};
    for (const r of records) {
      if (!userMap[r.user_id]) {
        const u = users.find((u) => u.id === r.user_id);
        userMap[r.user_id] = { user_id: r.user_id, user_name: r.user_name, department: r.department, role: u?.role || "", total_minutes: 0, days_worked: 0, days_seen: new Set() };
      }
      userMap[r.user_id].total_minutes += r.duration_minutes || 0;
      userMap[r.user_id].days_seen.add(r.date);
    }
    const userSummaries = Object.values(userMap).map((u) => ({ ...u, days_worked: u.days_seen.size, days_seen: undefined }));

    // Total summary
    const totalMinutes = records.reduce((s, r) => s + (r.duration_minutes || 0), 0);
    const uniqueDays   = new Set(records.map((r) => r.date)).size;
    const uniqueUsers  = new Set(records.map((r) => r.user_id)).size;

    res.json({
      success: true,
      data: {
        records,
        days: Object.values(dayMap),
        user_summaries: userSummaries,
        summary: {
          total_minutes: totalMinutes,
          unique_days: uniqueDays,
          unique_users: uniqueUsers,
          avg_minutes_per_day: uniqueDays ? Math.round(totalMinutes / uniqueDays) : 0,
        },
      },
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── Worktime Grid (all employees, date range) ──────────────────────────────
router.get("/worktime", authMiddleware, (req, res) => {
  try {
    const { start, end, user_id } = req.query;
    let records = db.getCollection("timeman_records");

    if (start) records = records.filter((r) => r.date >= start);
    if (end) records = records.filter((r) => r.date <= end);
    if (user_id) records = records.filter((r) => r.user_id === user_id);

    // Get users grouped by department
    const users = db.getCollection("users");
    const departments = {};
    users.forEach((u) => {
      const dept = u.department || "General";
      if (!departments[dept]) departments[dept] = [];
      const userRecords = records.filter((r) => r.user_id === u.id);
      departments[dept].push({
        user: u,
        records: userRecords,
        total_minutes: userRecords.reduce((s, r) => s + (r.duration_minutes || 0), 0),
      });
    });

    res.json({ success: true, data: { records, departments } });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── Individual Worktime History ────────────────────────────────────────────
router.get("/worktime/:userId", authMiddleware, (req, res) => {
  try {
    const records = db
      .getCollection("timeman_records")
      .filter((r) => r.user_id === req.params.userId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ success: true, data: records });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── Update Timeman Record ─────────────────────────────────────────────────
router.put("/records/:id", authMiddleware, (req, res) => {
  try {
    const { clock_in, clock_out, notes } = req.body;
    const updates = { notes };
    if (clock_in) updates.clock_in = clock_in;
    if (clock_out) {
      updates.clock_out = clock_out;
      updates.duration_minutes = calcDuration(clock_in || db.getById("timeman_records", req.params.id)?.clock_in, clock_out);
      updates.status = "completed";
    }
    const updated = db.update("timeman_records", req.params.id, updates);
    res.json({ success: true, data: updated });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── Work Reports ───────────────────────────────────────────────────────────
router.get("/reports", authMiddleware, (req, res) => {
  try {
    const { start, end, user_id, date } = req.query;
    let reports = db.getCollection("work_reports");
    if (date) reports = reports.filter((r) => r.date === date);
    if (start) reports = reports.filter((r) => r.date >= start);
    if (end) reports = reports.filter((r) => r.date <= end);
    if (user_id) reports = reports.filter((r) => r.user_id === user_id);
    res.json({ success: true, data: reports });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.post("/reports", authMiddleware, (req, res) => {
  try {
    const { report_text, plan_text, date, supervisor_id, tasks } = req.body;
    const user_id = req.user.id;
    const reportDate = date || todayStr();

    // Check for existing report
    const existing = db
      .getCollection("work_reports")
      .find((r) => r.user_id === user_id && r.date === reportDate);

    let report;
    if (existing) {
      report = db.update("work_reports", existing.id, {
        report_text,
        plan_text,
        supervisor_id,
        tasks,
        status: supervisor_id ? "sent" : "draft",
      });
    } else {
      report = db.insert("work_reports", {
        user_id,
        user_name: req.user.name,
        date: reportDate,
        report_text,
        plan_text,
        supervisor_id,
        tasks: tasks || [],
        score: null,
        status: supervisor_id ? "sent" : "draft",
        reviewed_at: null,
        comment: "",
      });
    }
    res.json({ success: true, data: report });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.patch("/reports/:id/score", authMiddleware, (req, res) => {
  try {
    const { score, comment } = req.body;
    const updated = db.update("work_reports", req.params.id, {
      score,
      comment,
      status: "reviewed",
      reviewed_at: new Date().toISOString(),
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.delete("/reports/:id", authMiddleware, (req, res) => {
  try {
    db.delete("work_reports", req.params.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── Work Schedules ─────────────────────────────────────────────────────────
router.get("/schedules", authMiddleware, (req, res) => {
  try {
    const schedules = db.getCollection("work_schedules");
    res.json({ success: true, data: schedules });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.post("/schedules", authMiddleware, (req, res) => {
  try {
    const { name, type, start_time, end_time, reporting_period, work_days, members } = req.body;
    const schedule = db.insert("work_schedules", {
      name,
      type: type || "Fixed",
      start_time: start_time || "09:00",
      end_time: end_time || "18:00",
      reporting_period: reporting_period || "month",
      work_days: work_days || [1, 2, 3, 4, 5],
      members: members || [],
      employees_count: (members || []).length,
    });
    res.json({ success: true, data: schedule });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.put("/schedules/:id", authMiddleware, (req, res) => {
  try {
    const updated = db.update("work_schedules", req.params.id, {
      ...req.body,
      employees_count: (req.body.members || []).length,
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.delete("/schedules/:id", authMiddleware, (req, res) => {
  try {
    db.delete("work_schedules", req.params.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── Absences ───────────────────────────────────────────────────────────────
router.get("/absences", authMiddleware, (req, res) => {
  try {
    const { start, end, user_id } = req.query;
    let absences = db.getCollection("absence_records");
    if (user_id) absences = absences.filter((a) => a.user_id === user_id);
    if (start) absences = absences.filter((a) => a.end_date >= start);
    if (end) absences = absences.filter((a) => a.start_date <= end);
    res.json({ success: true, data: absences });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.post("/absences", authMiddleware, (req, res) => {
  try {
    const { user_id, user_name, start_date, end_date, type, reason } = req.body;
    const absence = db.insert("absence_records", {
      user_id: user_id || req.user.id,
      user_name: user_name || req.user.name,
      start_date,
      end_date,
      type: type || "Sick Leave",
      reason: reason || "",
      status: "approved",
    });
    res.json({ success: true, data: absence });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.delete("/absences/:id", authMiddleware, (req, res) => {
  try {
    db.delete("absence_records", req.params.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

module.exports = router;
