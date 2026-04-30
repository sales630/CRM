/* eslint-disable */
const express = require("express");
const router = express.Router();
const db = require("../database");
const { authMiddleware } = require("./auth");

// ── Departments ────────────────────────────────────────────────────────────

router.get("/departments", authMiddleware, (req, res) => {
  try {
    const depts = db.getCollection("hr_departments");
    const employees = db.getCollection("hr_employees");
    const enriched = depts.map(d => ({
      ...d,
      employee_count: employees.filter(e => e.department_id === d.id && e.status === "active").length,
    }));
    res.json({ success: true, data: enriched });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.post("/departments", authMiddleware, (req, res) => {
  try {
    const { name, parent_id = null, description = "", head_id = null } = req.body;
    if (!name) return res.json({ success: false, error: "Name required" });
    const dept = db.insert("hr_departments", { name, parent_id, description, head_id, sort_order: 0 });
    res.json({ success: true, data: dept });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.put("/departments/:id", authMiddleware, (req, res) => {
  try {
    const updated = db.update("hr_departments", req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.delete("/departments/:id", authMiddleware, (req, res) => {
  try {
    // Move children to parent
    const dept = db.getById("hr_departments", req.params.id);
    if (dept) {
      db.getCollection("hr_departments")
        .filter(d => d.parent_id === req.params.id)
        .forEach(d => db.update("hr_departments", d.id, { parent_id: dept.parent_id }));
      // Unassign employees
      db.getCollection("hr_employees")
        .filter(e => e.department_id === req.params.id)
        .forEach(e => db.update("hr_employees", e.id, { department_id: null }));
    }
    db.delete("hr_departments", req.params.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── Employees ──────────────────────────────────────────────────────────────

router.get("/employees", authMiddleware, (req, res) => {
  try {
    const { department_id, search, status } = req.query;
    let employees = db.getCollection("hr_employees");
    if (department_id) employees = employees.filter(e => e.department_id === department_id);
    if (status) employees = employees.filter(e => e.status === status);
    if (search) {
      const s = search.toLowerCase();
      employees = employees.filter(e =>
        (e.name || "").toLowerCase().includes(s) ||
        (e.position || "").toLowerCase().includes(s) ||
        (e.email || "").toLowerCase().includes(s)
      );
    }
    // Enrich with department name
    const depts = db.getCollection("hr_departments");
    employees = employees.map(e => ({
      ...e,
      department_name: depts.find(d => d.id === e.department_id)?.name || "—",
    }));
    res.json({ success: true, data: employees });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.get("/employees/:id", authMiddleware, (req, res) => {
  try {
    const emp = db.getById("hr_employees", req.params.id);
    if (!emp) return res.json({ success: false, error: "Not found" });
    const dept = emp.department_id ? db.getById("hr_departments", emp.department_id) : null;
    const manager = emp.manager_id ? db.getById("hr_employees", emp.manager_id) : null;
    const reports = db.getCollection("hr_employees").filter(e => e.manager_id === req.params.id);
    res.json({ success: true, data: { ...emp, department: dept, manager, reports } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.post("/employees", authMiddleware, (req, res) => {
  try {
    const {
      name, position = "", department_id = null, manager_id = null,
      email = "", phone = "", status = "active", hire_date = null,
      avatar = "", bio = "", work_phone = "", location = "",
      is_team_leader = false,
    } = req.body;
    if (!name) return res.json({ success: false, error: "Name required" });
    const emp = db.insert("hr_employees", {
      name, position, department_id, manager_id,
      email, phone, work_phone, status, hire_date,
      avatar, bio, location, is_team_leader,
    });
    // If marked as team leader, auto-set as dept head
    if (is_team_leader && department_id) {
      db.update("hr_departments", department_id, { head_id: emp.id });
    }
    res.json({ success: true, data: emp });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.put("/employees/:id", authMiddleware, (req, res) => {
  try {
    const updated = db.update("hr_employees", req.params.id, req.body);
    if (!updated) return res.json({ success: false, error: "Not found" });
    // If promoted to team leader, auto-set as dept head
    if (req.body.is_team_leader && updated.department_id) {
      db.update("hr_departments", updated.department_id, { head_id: updated.id });
    }
    res.json({ success: true, data: updated });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.delete("/employees/:id", authMiddleware, (req, res) => {
  try {
    // Reassign their reports to their manager
    const emp = db.getById("hr_employees", req.params.id);
    if (emp) {
      db.getCollection("hr_employees")
        .filter(e => e.manager_id === req.params.id)
        .forEach(e => db.update("hr_employees", e.id, { manager_id: emp.manager_id }));
    }
    db.delete("hr_employees", req.params.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── Org Chart Tree ─────────────────────────────────────────────────────────
router.get("/tree", authMiddleware, (req, res) => {
  try {
    const depts = db.getCollection("hr_departments");
    const allEmployees = db.getCollection("hr_employees").filter(e => e.status !== "terminated");

    const buildTree = (parentId) => {
      return depts
        .filter(d => (d.parent_id || null) === (parentId || null))
        .map(d => {
          const members = allEmployees.filter(e => e.department_id === d.id);
          const head = d.head_id ? members.find(e => e.id === d.head_id) : null;
          // Team leader = the head employee (marked is_team_leader or set as head)
          const teamLeader = head || members.find(e => e.is_team_leader) || null;
          // Employees who report to the team leader
          const teamLeaderId = teamLeader?.id || null;
          const teamMembers = teamLeaderId
            ? members.filter(e => e.id !== teamLeaderId && e.manager_id === teamLeaderId)
            : members.filter(e => !e.is_team_leader);
          // Unassigned members (no manager, not team leader)
          const unassigned = members.filter(e =>
            e.id !== teamLeaderId &&
            !e.is_team_leader &&
            (!e.manager_id || !members.find(m => m.id === e.manager_id))
          );
          return {
            ...d,
            head,
            teamLeader,
            teamMembers,
            unassigned: unassigned.filter(e => !teamMembers.find(m => m.id === e.id)),
            members,
            employee_count: members.length,
            children: buildTree(d.id),
          };
        });
    };

    res.json({ success: true, data: buildTree(null) });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── Clear all HR data ──────────────────────────────────────────────────────
router.post("/clear-all", authMiddleware, (req, res) => {
  try {
    db.data["hr_departments"] = [];
    db.data["hr_employees"] = [];
    db.save();
    res.json({ success: true, data: { cleared: true } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── Seed default hierarchy ─────────────────────────────────────────────────
router.post("/seed", authMiddleware, (req, res) => {
  try {
    // Clear existing data
    db.data["hr_departments"] = [];
    db.data["hr_employees"] = [];
    db.save();
    // Force reload from defaultData by restarting — instead, just re-insert
    const departments = [
      { id: "hr-dept-exec",  name: "Executive Leadership",     parent_id: null, head_id: "hr-emp-sunil",     description: "Company leadership and strategic management",     sort_order: 0 },
      { id: "hr-dept-mkt",   name: "Marketing & Sales",        parent_id: null, head_id: "hr-emp-shubham",   description: "Business development, marketing and sales",         sort_order: 1 },
      { id: "hr-dept-ops",   name: "Operations",               parent_id: null, head_id: "hr-emp-harvinder", description: "Accounting operations and client delivery",          sort_order: 2 },
      { id: "hr-dept-it",    name: "IT & Development",         parent_id: null, head_id: "hr-emp-amit",      description: "Technology, web development and IT support",        sort_order: 3 },
      { id: "hr-dept-admin", name: "Administration & Finance", parent_id: null, head_id: "hr-emp-vinod",     description: "Office administration, HR and finance",             sort_order: 4 },
    ];
    const employees = [
      { id: "hr-emp-sunil",     name: "Sunil Khullar",    position: "Managing Director",              department_id: "hr-dept-exec",  manager_id: null,              email: "sunil@outsourcedbookeeping.org",     phone: "+91-98765-00001", status: "active", location: "Chandigarh, India", bio: "Managing Director and Administrator.",        hire_date: "2010-01-01" },
      { id: "hr-emp-shubham",   name: "Shubham Khullar",  position: "Business Development Manager",   department_id: "hr-dept-mkt",   manager_id: "hr-emp-sunil",    email: "shubham@outsourcedbookeeping.org",   phone: "+91-98765-00002", status: "active", location: "Chandigarh, India", bio: "Leads business development and marketing.",   hire_date: "2014-03-01" },
      { id: "hr-emp-harvinder", name: "Harvinder Singh",  position: "Deputy Director - Operations",   department_id: "hr-dept-ops",   manager_id: "hr-emp-sunil",    email: "harvinder@outsourcedbookeeping.org", phone: "+91-98765-00003", status: "active", location: "Chandigarh, India", bio: "Oversees all accounting operations.",         hire_date: "2013-06-01" },
      { id: "hr-emp-vinod",     name: "Vinod Kumar",      position: "Assistant Manager",              department_id: "hr-dept-admin", manager_id: "hr-emp-sunil",    email: "vinod@outsourcedbookeeping.org",     phone: "+91-98765-00004", status: "active", location: "Chandigarh, India", bio: "Manages administration and finance.",         hire_date: "2015-01-01" },
      { id: "hr-emp-govind",    name: "Govind Kaushik",   position: "Marketing Executive",            department_id: "hr-dept-mkt",   manager_id: "hr-emp-shubham",  email: "govind@outsourcedbookeeping.org",    phone: "+91-98765-00005", status: "active", location: "Chandigarh, India", bio: "Leads marketing and CRM management.",         hire_date: "2017-04-01" },
      { id: "hr-emp-divya",     name: "Divya Verma",      position: "SEO Executive",                  department_id: "hr-dept-mkt",   manager_id: "hr-emp-govind",   email: "divya@outsourcedbookeeping.org",     phone: "+91-98765-00006", status: "active", location: "Chandigarh, India", bio: "Handles SEO optimization.",                   hire_date: "2019-07-01" },
      { id: "hr-emp-sandeep",   name: "Sandeep Sharma",   position: "Senior SEO Executive",           department_id: "hr-dept-mkt",   manager_id: "hr-emp-govind",   email: "sandeep@outsourcedbookeeping.org",   phone: "+91-98765-00007", status: "active", location: "Chandigarh, India", bio: "Senior SEO specialist.",                      hire_date: "2018-02-01" },
      { id: "hr-emp-chaishta",  name: "Chaishta Khullar", position: "Business Development Executive", department_id: "hr-dept-mkt",   manager_id: "hr-emp-shubham",  email: "chaishta@outsourcedbookeeping.org",  phone: "+91-98765-00008", status: "active", location: "Chandigarh, India", bio: "Business development and client acquisition.", hire_date: "2020-09-01" },
      { id: "hr-emp-amrit",     name: "Amrit Kaur",       position: "Marketing Intern",               department_id: "hr-dept-mkt",   manager_id: "hr-emp-govind",   email: "amrit@outsourcedbookeeping.org",     phone: "+91-98765-00009", status: "active", location: "Chandigarh, India", bio: "Marketing intern.",                           hire_date: "2025-01-01" },
      { id: "hr-emp-amit",      name: "Amit Kumar",       position: "Web Developer",                  department_id: "hr-dept-it",    manager_id: "hr-emp-shubham",  email: "amit@outsourcedbookeeping.org",      phone: "+91-98765-00010", status: "active", location: "Chandigarh, India", bio: "Full-stack web developer.",                   hire_date: "2018-05-01" },
      { id: "hr-emp-ranjit",    name: "Ranjit Shah",      position: "IT Executive",                   department_id: "hr-dept-it",    manager_id: "hr-emp-vinod",    email: "ranjit@outsourcedbookeeping.org",    phone: "+91-98765-00011", status: "active", location: "Chandigarh, India", bio: "Manages IT infrastructure.",                  hire_date: "2019-03-01" },
      { id: "hr-emp-harsimran", name: "Harsimran Singh",  position: "Manager - Operations",           department_id: "hr-dept-ops",   manager_id: "hr-emp-harvinder",email: "harsimran@outsourcedbookeeping.org", phone: "+91-98765-00012", status: "active", location: "Chandigarh, India", bio: "Operations manager overseeing accounting teams.", hire_date: "2015-08-01" },
      { id: "hr-emp-bikker",    name: "Bikker Singh",     position: "Asst TL - Team 4 & 9",          department_id: "hr-dept-ops",   manager_id: "hr-emp-harsimran",email: "bikker@outsourcedbookeeping.org",    phone: "+91-98765-00013", status: "active", location: "Chandigarh, India", bio: "Leads accounting teams 4 and 9.",             hire_date: "2016-11-01" },
      { id: "hr-emp-puneet",    name: "Puneet Kaur",      position: "Asst TL - Team 1 & 2",          department_id: "hr-dept-ops",   manager_id: "hr-emp-harsimran",email: "puneet@outsourcedbookeeping.org",    phone: "+91-98765-00014", status: "active", location: "Chandigarh, India", bio: "Leads accounting teams 1 and 2.",             hire_date: "2016-04-01" },
      { id: "hr-emp-jagdish",   name: "Jagdish Kumar",    position: "Asst TL - Team 7",              department_id: "hr-dept-ops",   manager_id: "hr-emp-harsimran",email: "jagdish@outsourcedbookeeping.org",   phone: "+91-98765-00015", status: "active", location: "Chandigarh, India", bio: "Leads accounting team 7.",                    hire_date: "2017-09-01" },
      { id: "hr-emp-akhilesh",  name: "Akhilesh Pandey",  position: "Senior Accounts - Team 3",      department_id: "hr-dept-ops",   manager_id: "hr-emp-harsimran",email: "akhilesh@outsourcedbookeeping.org",  phone: "+91-98765-00016", status: "active", location: "Chandigarh, India", bio: "Senior accountant team 3.",                   hire_date: "2018-01-01" },
      { id: "hr-emp-gaurav",    name: "Gaurav Kumar",     position: "Senior Accounts - Team 1 & 2",  department_id: "hr-dept-ops",   manager_id: "hr-emp-harsimran",email: "gaurav@outsourcedbookeeping.org",    phone: "+91-98765-00017", status: "active", location: "Chandigarh, India", bio: "Senior accountant teams 1 and 2.",            hire_date: "2017-06-01" },
      { id: "hr-emp-dhanraj",   name: "Dhanraj Singh",    position: "Office Executive",              department_id: "hr-dept-admin", manager_id: "hr-emp-vinod",    email: "dhanraj@outsourcedbookeeping.org",   phone: "+91-98765-00018", status: "active", location: "Chandigarh, India", bio: "Manages office operations.",                  hire_date: "2019-10-01" },
      { id: "hr-emp-dwij",      name: "Dwij Raj Shukla",  position: "Accounts Executive",            department_id: "hr-dept-admin", manager_id: "hr-emp-vinod",    email: "dwij@outsourcedbookeeping.org",      phone: "+91-98765-00019", status: "active", location: "Chandigarh, India", bio: "Handles company accounts and payroll.",       hire_date: "2020-02-01" },
    ];
    const now = new Date().toISOString();
    departments.forEach(d => db.insert("hr_departments", { ...d, created_at: now, updated_at: now }));
    employees.forEach(e => db.insert("hr_employees", { ...e, created_at: now, updated_at: now }));
    res.json({ success: true, data: { departments: departments.length, employees: employees.length } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── Get assignee by lead_for field ────────────────────────────────────────
// Returns the best team leader to assign a task to based on lead_for keyword
router.get("/assignee", (req, res) => {
  try {
    const { lead_for = "", email = "" } = req.query;
    const lf = (lead_for || "").toLowerCase();

    // Find lead by email to get lead_for if not provided
    let resolvedLeadFor = lf;
    if (!resolvedLeadFor && email) {
      const lead = db.getCollection("leads").find(l =>
        (l.email || "").toLowerCase() === email.toLowerCase()
      );
      if (lead) resolvedLeadFor = (lead.lead_for || "").toLowerCase();
    }

    // Hierarchy-based assignment logic
    let assignee = "Govind Kaushik";      // default: marketing executive
    let reason = "Default assignment";

    if (resolvedLeadFor.includes("tax") || resolvedLeadFor.includes("return")) {
      assignee = "Sunil Khullar";
      reason = "Tax-related lead → Managing Director";
    } else if (resolvedLeadFor.includes("operation") || resolvedLeadFor.includes("account")) {
      assignee = "Harsimran Singh";
      reason = "Operations/accounting lead → Manager Operations";
    } else if (resolvedLeadFor.includes("back office") || resolvedLeadFor.includes("backoffice")) {
      assignee = "Vinod Kumar";
      reason = "Back Office lead → Assistant Manager";
    } else if (resolvedLeadFor.includes("outsource") || resolvedLeadFor.includes("bookkeep") || resolvedLeadFor.includes("marketing")) {
      assignee = "Govind Kaushik";
      reason = "Outsourced Bookkeeping lead → Marketing Executive";
    }

    // Find the employee record
    const emp = db.getCollection("hr_employees").find(e => e.name === assignee);
    res.json({ success: true, data: { assignee, reason, employee: emp || null } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── Stats ──────────────────────────────────────────────────────────────────
router.get("/stats", authMiddleware, (req, res) => {
  try {
    const employees = db.getCollection("hr_employees");
    const depts = db.getCollection("hr_departments");
    const active = employees.filter(e => e.status === "active").length;
    const byDept = {};
    depts.forEach(d => {
      byDept[d.name] = employees.filter(e => e.department_id === d.id && e.status === "active").length;
    });
    res.json({ success: true, data: { total: employees.length, active, departments: depts.length, byDept } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

module.exports = router;
