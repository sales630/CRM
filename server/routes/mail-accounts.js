/* eslint-disable */
const express = require("express");
const router = express.Router();
const db = require("../database");
const { authMiddleware } = require("./auth");
const nodemailer = require("nodemailer");
const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");

// ── Provider presets ───────────────────────────────────────────────────────
const PROVIDERS = {
  gmail: {
    imap_host: "imap.gmail.com", imap_port: 993, imap_secure: true,
    smtp_host: "smtp.gmail.com", smtp_port: 587, smtp_secure: false,
  },
  outlook: {
    imap_host: "outlook.office365.com", imap_port: 993, imap_secure: true,
    smtp_host: "smtp.office365.com", smtp_port: 587, smtp_secure: false,
  },
  icloud: {
    imap_host: "imap.mail.me.com", imap_port: 993, imap_secure: true,
    smtp_host: "smtp.mail.me.com", smtp_port: 587, smtp_secure: false,
  },
  office365: {
    imap_host: "outlook.office365.com", imap_port: 993, imap_secure: true,
    smtp_host: "smtp.office365.com", smtp_port: 587, smtp_secure: false,
  },
  custom: {},
};

function detectProvider(email) {
  const domain = (email || "").split("@")[1]?.toLowerCase();
  if (!domain) return "custom";
  if (domain.includes("gmail")) return "gmail";
  if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live") || domain.includes("msn")) return "outlook";
  if (domain.includes("icloud") || domain.includes("me.com") || domain.includes("mac.com")) return "icloud";
  if (domain.includes("office365")) return "office365";
  return "custom";
}

// ── GET all mail accounts for current user ─────────────────────────────────
router.get("/accounts", authMiddleware, (req, res) => {
  try {
    const accounts = db.getCollection("mail_accounts").filter(a => a.user_id === req.user.id);
    // Don't expose password
    const safe = accounts.map(({ password, ...a }) => a);
    res.json({ success: true, data: safe });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── POST connect a mail account ────────────────────────────────────────────
router.post("/accounts", authMiddleware, async (req, res) => {
  try {
    const { email, password, provider: providerHint, imap_host, imap_port, smtp_host, smtp_port } = req.body;
    if (!email || !password) return res.json({ success: false, error: "Email and password required" });

    const provider = providerHint || detectProvider(email);
    const preset = PROVIDERS[provider] || {};

    const config = {
      imap_host: imap_host || preset.imap_host || "",
      imap_port: imap_port || preset.imap_port || 993,
      imap_secure: preset.imap_secure !== undefined ? preset.imap_secure : true,
      smtp_host: smtp_host || preset.smtp_host || "",
      smtp_port: smtp_port || preset.smtp_port || 587,
      smtp_secure: preset.smtp_secure !== undefined ? preset.smtp_secure : false,
    };

    // Test IMAP connection
    const client = new ImapFlow({
      host: config.imap_host,
      port: config.imap_port,
      secure: config.imap_secure,
      auth: { user: email, pass: password },
      logger: false,
      tls: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      await client.logout();
    } catch (connErr) {
      return res.json({ success: false, error: `Connection failed: ${connErr.message}. For Gmail, use an App Password (myaccount.google.com → Security → App Passwords).` });
    }

    // Remove existing account for same email+user
    const existing = db.getCollection("mail_accounts").find(a => a.user_id === req.user.id && a.email === email);
    if (existing) db.delete("mail_accounts", existing.id);

    const account = db.insert("mail_accounts", {
      user_id: req.user.id,
      user_name: req.user.name,
      email,
      password, // In production, encrypt this
      provider,
      ...config,
      status: "connected",
      last_sync: null,
      is_main_inbox: false,
    });

    const { password: _, ...safe } = account;
    res.json({ success: true, data: safe });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── PUT update account settings (e.g. is_main_inbox toggle) ──────────────
router.put("/accounts/:id", authMiddleware, (req, res) => {
  try {
    const account = db.getById("mail_accounts", req.params.id);
    if (!account || account.user_id !== req.user.id)
      return res.json({ success: false, error: "Account not found" });

    const { is_main_inbox, ...rest } = req.body;

    // If setting this account as main inbox, clear the flag on all others for this user
    if (is_main_inbox === true) {
      db.getCollection("mail_accounts")
        .filter(a => a.user_id === req.user.id && a.id !== req.params.id)
        .forEach(a => db.update("mail_accounts", a.id, { is_main_inbox: false }));
    }

    const updates = { ...rest };
    if (is_main_inbox !== undefined) updates.is_main_inbox = is_main_inbox;

    const updated = db.update("mail_accounts", req.params.id, updates);
    const { password: _, ...safe } = updated;
    res.json({ success: true, data: safe });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── DELETE disconnect a mail account ──────────────────────────────────────
router.delete("/accounts/:id", authMiddleware, (req, res) => {
  try {
    db.delete("mail_accounts", req.params.id);
    // Also delete cached emails for this account
    const cached = db.getCollection("mail_cache").filter(m => m.account_id === req.params.id);
    cached.forEach(m => db.delete("mail_cache", m.id));
    res.json({ success: true, data: { deleted: true } });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── Helper: strip HTML to plain text ──────────────────────────────────────
function stripHtml(str) {
  return (str || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

// ── GET fetch emails via IMAP (envelopes only — fast) ─────────────────────
router.get("/fetch/:accountId", authMiddleware, async (req, res) => {
  try {
    const account = db.getById("mail_accounts", req.params.accountId);
    if (!account || account.user_id !== req.user.id)
      return res.json({ success: false, error: "Account not found" });

    const { folder = "INBOX", limit = 50, category = "all" } = req.query;
    const isGmail = (account.imap_host || "").includes("gmail") || (account.email || "").endsWith("@gmail.com") || (account.email || "").includes("googlemail");

    const client = new ImapFlow({
      host: account.imap_host,
      port: account.imap_port,
      secure: account.imap_secure,
      auth: { user: account.email, pass: account.password },
      logger: false,
      tls: { rejectUnauthorized: false },
    });

    await client.connect();
    const lock = await client.getMailboxLock(folder);
    const emails = [];

    try {
      const total = client.mailbox.exists;
      if (!total || total === 0) {
        lock.release();
        await client.logout();
        return res.json({ success: true, data: [] });
      }

      let uidsToFetch = null;

      // ── Gmail category filtering via X-GM-RAW ──────────────────────────
      if (isGmail && folder === "INBOX" && category !== "all") {
        try {
          const gmailQuery = `category:${category} in:inbox`;
          const foundUids = await client.search({ gmailRaw: gmailQuery }, { uid: true });
          // Sort descending (most recent UIDs first) and take limit
          uidsToFetch = (foundUids || []).sort((a, b) => b - a).slice(0, parseInt(limit));
        } catch (searchErr) {
          // Gmail X-GM-RAW not available — fall back to full fetch
          console.warn("[Mail] Gmail category search unavailable, falling back:", searchErr.message);
          uidsToFetch = null;
        }
      }

      if (uidsToFetch !== null) {
        // Fetch specific UIDs from category search
        if (uidsToFetch.length === 0) {
          lock.release();
          await client.logout();
          return res.json({ success: true, data: [] });
        }
        for await (const msg of client.fetch(uidsToFetch, { uid: true, flags: true, envelope: true }, { uid: true })) {
          const from = msg.envelope?.from?.[0];
          const to   = msg.envelope?.to?.[0];
          emails.push({
            uid: msg.uid,
            id: `${account.id}_${msg.uid}`,
            from: from ? (from.name || from.address) : "Unknown",
            email: from?.address || "",
            to: to?.address || "",
            subject: msg.envelope?.subject || "(no subject)",
            body: "",
            time: msg.envelope?.date
              ? new Date(msg.envelope.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
              : "",
            date: msg.envelope?.date || new Date().toISOString(),
            read: msg.flags?.has("\\Seen"),
            starred: msg.flags?.has("\\Flagged"),
            folder: folder.toLowerCase(),
            tags: [],
            account_id: account.id,
            account_email: account.email,
          });
        }
      } else {
        // Default: fetch latest N by sequence range
        const start = Math.max(1, total - parseInt(limit) + 1);
        const range = `${start}:${total}`;
        for await (const msg of client.fetch(range, { uid: true, flags: true, envelope: true })) {
          const from = msg.envelope?.from?.[0];
          const to   = msg.envelope?.to?.[0];
          emails.push({
            uid: msg.uid,
            id: `${account.id}_${msg.uid}`,
            from: from ? (from.name || from.address) : "Unknown",
            email: from?.address || "",
            to: to?.address || "",
            subject: msg.envelope?.subject || "(no subject)",
            body: "",
            time: msg.envelope?.date
              ? new Date(msg.envelope.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
              : "",
            date: msg.envelope?.date || new Date().toISOString(),
            read: msg.flags?.has("\\Seen"),
            starred: msg.flags?.has("\\Flagged"),
            folder: folder.toLowerCase(),
            tags: [],
            account_id: account.id,
            account_email: account.email,
          });
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();

    emails.sort((a, b) => new Date(b.date) - new Date(a.date));
    db.update("mail_accounts", account.id, { last_sync: new Date().toISOString() });
    res.json({ success: true, data: emails });
  } catch (e) {
    res.json({ success: false, error: `IMAP error: ${e.message}` });
  }
});

// ── GET fetch single email body + attachments by UID ─────────────────────
router.get("/body/:accountId/:uid", authMiddleware, async (req, res) => {
  try {
    const account = db.getById("mail_accounts", req.params.accountId);
    if (!account || account.user_id !== req.user.id)
      return res.json({ success: false, error: "Account not found" });

    const uid = parseInt(req.params.uid);
    const { folder = "INBOX" } = req.query;

    const client = new ImapFlow({
      host: account.imap_host, port: account.imap_port, secure: account.imap_secure,
      auth: { user: account.email, pass: account.password },
      logger: false, tls: { rejectUnauthorized: false },
    });

    await client.connect();

    let parsed = null;
    const lock = await client.getMailboxLock(folder);
    try {
      // fetchOne with source:true gives the full RFC822 raw message as a Buffer
      const msg = await client.fetchOne(`${uid}`, { source: true }, { uid: true });
      if (msg && msg.source) {
        parsed = await simpleParser(msg.source);
      }
    } finally {
      lock.release();
      await client.logout();
    }

    if (!parsed) {
      return res.json({ success: true, data: { html: "", text: "(could not parse email)", attachments: [] } });
    }

    // Separate real attachments from inline parts
    const attachments = (parsed.attachments || [])
      .filter(a => a.contentDisposition === "attachment" || (a.filename && !a.cid))
      .map((a, i) => ({
        index: i,
        filename: a.filename || `attachment-${i + 1}`,
        contentType: a.contentType,
        size: a.size || (a.content ? a.content.length : 0),
      }));

    // Try to get best body content
    let html = parsed.html || "";
    let text = parsed.text || "";

    // If still empty, try textAsHtml (mailparser generates this from plain text)
    if (!html && !text && parsed.textAsHtml) {
      html = parsed.textAsHtml;
    }

    // For forwarded emails with no body but embedded message — extract from headers
    if (!html && !text) {
      const fwdParts = [];
      if (parsed.from?.text) fwdParts.push(`From: ${parsed.from.text}`);
      if (parsed.to?.text) fwdParts.push(`To: ${parsed.to.text}`);
      if (parsed.subject) fwdParts.push(`Subject: ${parsed.subject}`);
      if (parsed.date) fwdParts.push(`Date: ${new Date(parsed.date).toLocaleString()}`);
      if (attachments.length > 0) fwdParts.push(`\n[${attachments.length} attachment(s): ${attachments.map(a => a.filename).join(", ")}]`);
      if (fwdParts.length > 0) text = fwdParts.join("\n");
    }

    res.json({
      success: true,
      data: {
        html,
        text,
        attachments,
        from: parsed.from?.text || "",
        subject: parsed.subject || "",
        date: parsed.date || null,
      }
    });
  } catch (e) {
    res.json({ success: false, error: `Body fetch error: ${e.message}` });
  }
});

// ── GET list mailbox folders ───────────────────────────────────────────────
router.get("/folders/:accountId", authMiddleware, async (req, res) => {
  try {
    const account = db.getById("mail_accounts", req.params.accountId);
    if (!account || account.user_id !== req.user.id)
      return res.json({ success: false, error: "Account not found" });

    const client = new ImapFlow({
      host: account.imap_host,
      port: account.imap_port,
      secure: account.imap_secure,
      auth: { user: account.email, pass: account.password },
      logger: false,
      tls: { rejectUnauthorized: false },
    });

    await client.connect();
    const list = await client.list();
    await client.logout();

    const folders = list.map(f => ({
      path: f.path,
      name: f.name,
      delimiter: f.delimiter,
      flags: [...(f.flags || [])],
    }));

    res.json({ success: true, data: folders });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── POST send email via SMTP ───────────────────────────────────────────────
router.post("/send/:accountId", authMiddleware, async (req, res) => {
  try {
    const account = db.getById("mail_accounts", req.params.accountId);
    if (!account || account.user_id !== req.user.id)
      return res.json({ success: false, error: "Account not found" });

    const { to, subject, body, attachments = [] } = req.body;
    if (!to || !subject) return res.json({ success: false, error: "To and subject required" });

    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port,
      secure: account.smtp_secure,
      auth: { user: account.email, pass: account.password },
      tls: { rejectUnauthorized: false },
    });

    const mailOptions = {
      from: `"${req.user.name}" <${account.email}>`,
      to,
      subject,
      text: body,
      html: body ? `<div style="font-family:sans-serif;white-space:pre-wrap">${body}</div>` : "",
    };

    if (attachments.length > 0) {
      mailOptions.attachments = attachments.map(a => ({
        filename: a.fileName,
        content: a.data?.split(",")[1] || a.data,
        encoding: "base64",
        contentType: a.fileType,
      }));
    }

    const info = await transporter.sendMail(mailOptions);
    res.json({ success: true, data: { messageId: info.messageId, accepted: info.accepted } });
  } catch (e) {
    res.json({ success: false, error: `Send failed: ${e.message}` });
  }
});

// ── PATCH mark email as read/starred via IMAP ─────────────────────────────
router.patch("/flag/:accountId", authMiddleware, async (req, res) => {
  try {
    const account = db.getById("mail_accounts", req.params.accountId);
    if (!account || account.user_id !== req.user.id)
      return res.json({ success: false, error: "Account not found" });

    const { uid, folder = "INBOX", flag, action } = req.body;
    const client = new ImapFlow({
      host: account.imap_host, port: account.imap_port, secure: account.imap_secure,
      auth: { user: account.email, pass: account.password },
      logger: false, tls: { rejectUnauthorized: false },
    });

    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      if (action === "add") await client.messageFlagsAdd({ uid }, [flag], { uid: true });
      else await client.messageFlagsRemove({ uid }, [flag], { uid: true });
    } finally { lock.release(); }
    await client.logout();

    res.json({ success: true, data: { done: true } });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── GET provider presets ───────────────────────────────────────────────────
router.get("/providers", (req, res) => {
  res.json({ success: true, data: PROVIDERS });
});

// ── Helper: resolve assignee from dynamic rules in DB ─────────────────────
// Rules are checked in priority order:
//   from_email    → exact sender email match
//   domain        → sender email domain match
//   subject_keyword → keyword appears in subject (case-insensitive)
//   default       → catch-all (condition_value = "*")
// Falls back to first active user if no rule matches.
function resolveAssigneeFromRules(senderEmail, subject) {
  const rules = db.getCollection("mail_assignment_rules")
    .filter(r => r.active !== false)
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));

  const emailLow   = (senderEmail || "").toLowerCase().trim();
  const subjectLow = (subject     || "").toLowerCase();
  const domain     = emailLow.includes("@") ? emailLow.split("@")[1] : "";

  for (const rule of rules) {
    const val = (rule.condition_value || "").toLowerCase().trim();
    switch (rule.condition_type) {
      case "from_email":
        if (emailLow && emailLow === val) return { assignee: rule.assign_to, reason: `Rule: email match "${rule.condition_value}"` };
        break;
      case "domain":
        if (domain && domain === val) return { assignee: rule.assign_to, reason: `Rule: domain match "${rule.condition_value}"` };
        break;
      case "subject_keyword":
        if (val && subjectLow.includes(val)) return { assignee: rule.assign_to, reason: `Rule: subject keyword "${rule.condition_value}"` };
        break;
      case "default":
        return { assignee: rule.assign_to, reason: "Rule: default catch-all" };
      default:
        break;
    }
  }

  // No rule matched — fall back to first admin/team_leader user
  const users = db.getCollection("users");
  const fallback = users.find(u => u.role === "admin" || u.role === "team_leader") || users[0];
  return { assignee: fallback?.name || "Unassigned", reason: "Fallback: no matching rule" };
}

// ── POST create a task from an email (group + hierarchy-based assignment) ───
// Called when user opens/clicks an email in the Mail module
router.post("/email-task", authMiddleware, (req, res) => {
  try {
    const { from, email: senderEmail, subject, body = "", received_at } = req.body;
    if (!from && !senderEmail) return res.json({ success: false, error: "Sender info required" });

    const senderNorm  = (senderEmail || "").toLowerCase().trim();
    const fromNorm    = (from || "").toLowerCase().trim();
    const subjectNorm = (subject || "").toLowerCase();

    // ── STEP 1: Match against Projects (Groups) ────────────────────────────
    // Priority: client_email exact match → project name in subject → project name in from
    const projects = db.getCollection("projects").filter(p => p.status !== "archived");
    let matchedProject = null;

    // 1a. Sender email exactly matches a project's client_email
    matchedProject = projects.find(p =>
      p.client_email && p.client_email.toLowerCase().trim() === senderNorm
    );

    // 1b. Project name appears in the email subject
    if (!matchedProject) {
      matchedProject = projects.find(p =>
        p.name && subjectNorm.includes(p.name.toLowerCase().trim())
      );
    }

    // 1c. Project name appears in the sender name
    if (!matchedProject) {
      matchedProject = projects.find(p =>
        p.name && fromNorm.includes(p.name.toLowerCase().trim())
      );
    }

    // ── STEP 2: Match against Leads ────────────────────────────────────────
    const leads = db.getCollection("leads");
    const lead = leads.find(l =>
      l.email && senderEmail &&
      l.email.toLowerCase() === senderNorm
    );

    // ── STEP 3: Determine assignee ─────────────────────────────────────────
    let assignee, reason;
    let projectId = null;
    let groupName = null;

    if (matchedProject) {
      // Group match — assign to the project's assigned team leader first
      const teamLeader = matchedProject.assigned_to || matchedProject.team_leader || "";
      if (teamLeader) {
        assignee = teamLeader;
        reason   = `Group match: "${matchedProject.name}" → assigned to team leader ${teamLeader}`;
      } else {
        // Team leader not set — fall through to rule-based lookup
        const resolved = resolveAssigneeFromRules(senderNorm, subject);
        assignee = resolved.assignee;
        reason   = `Group match: "${matchedProject.name}" → ${resolved.reason}`;
      }
      projectId = matchedProject.id;
      groupName = matchedProject.name;

    } else if (lead?.responsible) {
      // Lead has an explicit responsible person
      assignee = lead.responsible;
      reason   = "Assigned to lead's responsible person";

    } else {
      // No project/lead match — check dynamic assignment rules
      const resolved = resolveAssigneeFromRules(senderNorm, subject);
      assignee = resolved.assignee;
      reason   = resolved.reason;
    }

    // ── STEP 4: Create the task (linked to project if matched) ─────────────
    const deadline = new Date(Date.now() + 86400000).toISOString(); // +1 day
    const taskTitle = matchedProject
      ? `[${matchedProject.name}] Email from ${from || senderEmail}: ${subject || "(no subject)"}`
      : `Follow up on email: ${subject || "(no subject)"}`;

    const task = db.insert("tasks", {
      title:       taskTitle,
      description: `Email received from: ${from || senderEmail}\nEmail: ${senderEmail || ""}\nSubject: ${subject || ""}\nGroup: ${groupName || "N/A"}\n\n${body ? body.substring(0, 400) + (body.length > 400 ? "..." : "") : ""}`.trim(),
      assignee,
      assigned_to: assignee,
      priority:    lead?.priority || matchedProject?.priority || "medium",
      status:      "pending",
      deadline,
      entity_type: matchedProject ? "project" : lead ? "lead" : "email",
      entity_id:   projectId || lead?.id || "",
      project_id:  projectId || null,
      group_name:  groupName || null,
      created_by:  req.user?.name || "System",
      tags:        ["email", "auto", ...(groupName ? ["group"] : [])],
      source_email:   senderEmail || "",
      source_subject: subject || "",
    });

    // ── STEP 5: Log activity ────────────────────────────────────────────────
    // On the matched project
    if (matchedProject) {
      db.insert("activities", {
        type:        "email",
        title:       `Email received: ${subject || "(no subject)"}`,
        description: `Auto-task created from group email. Assigned to ${assignee}`,
        entity_type: "project",
        entity_id:   matchedProject.id,
        assigned_to: assignee,
        due_date:    deadline.split("T")[0],
        due_time:    "09:00",
        completed:   false,
        direction:   "incoming",
        duration:    null,
      });
    }
    // On the lead (if found separately)
    if (lead) {
      db.insert("activities", {
        type:        "email",
        title:       `Email received: ${subject || "(no subject)"}`,
        description: `Auto-task created and assigned to ${assignee}`,
        entity_type: "lead",
        entity_id:   lead.id,
        assigned_to: assignee,
        due_date:    deadline.split("T")[0],
        due_time:    "09:00",
        completed:   false,
        direction:   "incoming",
        duration:    null,
      });
    }

    // ── STEP 6: Notify the assigned team leader ────────────────────────────
    db.insert("notifications", {
      type:        "email_task",
      title:       `New task from email${groupName ? ` [${groupName}]` : ""}`,
      message:     `Email from ${from || senderEmail} auto-created a task: "${taskTitle}"`,
      target:      assignee,
      entity_type: "task",
      entity_id:   task.id,
      read:        false,
    });

    res.json({
      success: true,
      data: { task, assignee, reason, project: matchedProject || null, lead: lead || null }
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

module.exports = router;
