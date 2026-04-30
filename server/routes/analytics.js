const express = require("express");
const router = express.Router();
const db = require("../database");

router.get("/overview", (req, res) => {
  try {
    const leads = db.getCollection("leads");
    const deals = db.getCollection("deals");
    const contacts = db.getCollection("contacts");
    const companies = db.getCollection("companies");
    const activities = db.getCollection("activities");

    const totalLeads = leads.length;
    const totalDeals = deals.length;
    const totalContacts = contacts.length;
    const totalCompanies = companies.length;
    const totalRevenue = deals
      .filter((d) => d.stage === "Won")
      .reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const pipelineValue = deals
      .filter((d) => !["Won", "Lost"].includes(d.stage))
      .reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const pendingActivities = activities.filter((a) => !a.completed).length;

    // by stage
    const leadsByStageMap = {};
    leads.forEach((l) => {
      leadsByStageMap[l.stage] = leadsByStageMap[l.stage] || { stage: l.stage, count: 0, total: 0 };
      leadsByStageMap[l.stage].count++;
      leadsByStageMap[l.stage].total += Number(l.amount) || 0;
    });

    const dealsByStageMap = {};
    deals.forEach((d) => {
      dealsByStageMap[d.stage] = dealsByStageMap[d.stage] || { stage: d.stage, count: 0, total: 0 };
      dealsByStageMap[d.stage].count++;
      dealsByStageMap[d.stage].total += Number(d.amount) || 0;
    });

    // by source
    const leadsBySourceMap = {};
    leads.forEach((l) => {
      const k = l.source || "Unknown";
      leadsBySourceMap[k] = leadsBySourceMap[k] || { source: k, count: 0 };
      leadsBySourceMap[k].count++;
    });
    const dealsBySourceMap = {};
    deals.forEach((d) => {
      const k = d.source || "Unknown";
      dealsBySourceMap[k] = dealsBySourceMap[k] || { source: k, count: 0 };
      dealsBySourceMap[k].count++;
    });

    // by contact type
    const contactsByTypeMap = {};
    contacts.forEach((c) => {
      contactsByTypeMap[c.type] = contactsByTypeMap[c.type] || { type: c.type, count: 0 };
      contactsByTypeMap[c.type].count++;
    });

    const recentLeads = [...leads]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);
    const recentDeals = [...deals]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    // Monthly
    const monthlyLeadsMap = {};
    leads.forEach((l) => {
      const m = l.created_at ? l.created_at.substring(0, 7) : "";
      if (m) {
        monthlyLeadsMap[m] = monthlyLeadsMap[m] || { month: m, count: 0, amount: 0 };
        monthlyLeadsMap[m].count++;
        monthlyLeadsMap[m].amount += Number(l.amount) || 0;
      }
    });
    const monthlyDealsMap = {};
    deals.forEach((d) => {
      const m = d.created_at ? d.created_at.substring(0, 7) : "";
      if (m) {
        monthlyDealsMap[m] = monthlyDealsMap[m] || { month: m, count: 0, amount: 0 };
        monthlyDealsMap[m].count++;
        monthlyDealsMap[m].amount += Number(d.amount) || 0;
      }
    });

    const monthlyLeads = Object.values(monthlyLeadsMap)
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12);
    const monthlyDeals = Object.values(monthlyDealsMap)
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12);

    // Funnel
    const assignedLeads = leads.filter((l) => l.stage !== "Fresh Leads").length;
    const inProgress = leads.filter((l) => l.stage === "Connected / In Progress").length;
    const wonDeals = deals.filter((d) => d.stage === "Won").length;
    const funnel = [
      { stage: "Leads Total", count: totalLeads },
      { stage: "Assigned", count: assignedLeads },
      { stage: "In Progress", count: inProgress },
      { stage: "Converted to Deal", count: totalDeals },
      { stage: "Won", count: wonDeals },
    ];

    res.json({
      success: true,
      data: {
        summary: {
          totalLeads,
          totalDeals,
          totalContacts,
          totalCompanies,
          totalRevenue,
          pipelineValue,
          pendingActivities,
        },
        leadsByStage: Object.values(leadsByStageMap),
        dealsByStage: Object.values(dealsByStageMap),
        leadsBySource: Object.values(leadsBySourceMap)
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
        dealsBySource: Object.values(dealsBySourceMap)
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
        contactsByType: Object.values(contactsByTypeMap),
        recentLeads,
        recentDeals,
        monthlyLeads,
        monthlyDeals,
        funnel,
        activitiesCount: [
          { type: "call", count: activities.filter((a) => a.type === "call").length },
          { type: "email", count: activities.filter((a) => a.type === "email").length },
          { type: "task", count: activities.filter((a) => a.type === "task").length },
          { type: "meeting", count: activities.filter((a) => a.type === "meeting").length },
        ],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
