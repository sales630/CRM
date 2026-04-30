/* eslint-disable */
/**
 * Email Poller Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Polls all mail accounts marked as `is_main_inbox = true` every 5 minutes.
 * For each new (unseen) email it auto-creates a task using the same
 * resolveAssigneeFromRules logic used in the manual /email-task endpoint.
 *
 * Tracks which UIDs have already been processed in the `mail_processed_uids`
 * collection so emails are never double-processed across restarts.
 */

const { ImapFlow }    = require("imapflow");
const { simpleParser } = require("mailparser");
const db              = require("../database");

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ── Default assignee (when no rule matches) ────────────────────────────────
// ONE person receives the task when no routing rule matches.
const DEFAULT_ASSIGNEE = "Rajesh Kumar Gupta";

// ── Subjects / senders to ignore — not real client emails ─────────────────
const SKIP_SUBJECT_PATTERNS = [
  /text message received/i,
  /new text message/i,
  /voicemail/i,
  /unsubscribe/i,
  /no.reply/i,
  /noreply/i,
  /do.not.reply/i,
  /automatic.reply/i,
  /out of office/i,
  /delivery.status.notification/i,
  /mail delivery failed/i,
  /mailer.daemon/i,
];
const SKIP_SENDER_PATTERNS = [
  /mailer-daemon/i,
  /postmaster/i,
  /no.reply/i,
  /noreply/i,
  /do.not.reply/i,
  /notifications?@/i,
  /alerts?@/i,
  /support@google/i,
  /googlecalendar/i,
];

// ── Resolve assignee from DB rules ─────────────────────────────────────────
// Returns { assignee, reason } for a single match, or
//         { assignees, reason } for the multi-person default fallback.
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

  // No rule matched — fall back to single default assignee
  return { assignee: DEFAULT_ASSIGNEE, reason: `Default assignee (${DEFAULT_ASSIGNEE})` };
}

// ── Check if this email should be skipped (spam/notifications/SMS) ────────
function shouldSkipEmail(senderEmail, subject) {
  const subj = subject || "";
  const sender = senderEmail || "";
  for (const pat of SKIP_SUBJECT_PATTERNS) {
    if (pat.test(subj)) return `Subject matches skip pattern: ${pat}`;
  }
  for (const pat of SKIP_SENDER_PATTERNS) {
    if (pat.test(sender)) return `Sender matches skip pattern: ${pat}`;
  }
  return null; // do not skip
}

// ── Generate next OB-XXXX task number ─────────────────────────────────────
function nextTaskNumber() {
  const tasks = db.getCollection("tasks");
  let max = 0;
  tasks.forEach((t) => {
    if (t.task_number) {
      const m = String(t.task_number).match(/OB-(\d+)/i);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  });
  return `OB-${String(max + 1).padStart(4, "0")}`;
}

// ── Check if a UID was already processed for this account ─────────────────
function isAlreadyProcessed(accountId, uid) {
  return db.getCollection("mail_processed_uids").some(
    r => r.account_id === accountId && r.uid === String(uid)
  );
}

function markProcessed(accountId, uid) {
  db.insert("mail_processed_uids", {
    account_id: accountId,
    uid:        String(uid),
    processed_at: new Date().toISOString(),
  });
}

// ── Resolve personal task-email token from To: addresses ──────────────────
// Returns { userName, token } if a +TOKEN match is found, otherwise null.
// Matches any "to" address of the form  localpart+TOKEN@domain
function resolvePersonalToken(toAddresses) {
  if (!Array.isArray(toAddresses) || toAddresses.length === 0) return null;
  const users = db.getCollection("users");
  for (const addr of toAddresses) {
    const address = (addr.address || addr.text || "").toLowerCase().trim();
    // Match: anything+TOKEN@anything  (TOKEN = 8 hex chars)
    const m = address.match(/\+([0-9a-f]{8})@/i);
    if (!m) continue;
    const token = m[1].toLowerCase();
    const user  = users.find(u => u.task_email_token === token);
    if (user) return { userName: user.name, token };
  }
  return null;
}

// ── Process a single email ─────────────────────────────────────────────────
// assigneeOverride: if set (e.g. from a label rule), skip the normal rule resolution
// labelName: if set, include in task title and tags
// toAddresses: raw envelope.to array — checked for personal +token routing
function processEmail({ from, senderEmail, subject, body, account, assigneeOverride, labelName, toAddresses }) {
  const senderNorm  = (senderEmail || "").toLowerCase().trim();
  const subjectNorm = (subject || "").toLowerCase();

  // ── Skip spam, notifications, SMS alerts etc. ─────────────────────────────
  const skipReason = shouldSkipEmail(senderNorm, subject);
  if (skipReason) {
    console.log(`[Poller] Skipping non-client email: ${skipReason} — "${subject}"`);
    return null;
  }

  // ── Personal token routing (highest priority) ────────────────────────────
  // If email was addressed to team+TOKEN@domain, assign directly to that user
  const personalMatch = resolvePersonalToken(toAddresses || []);

  // Match against projects
  const projects = db.getCollection("projects").filter(p => p.status !== "archived");
  let matchedProject =
    projects.find(p => p.client_email && p.client_email.toLowerCase().trim() === senderNorm) ||
    projects.find(p => p.name && subjectNorm.includes(p.name.toLowerCase().trim())) ||
    projects.find(p => p.name && (from || "").toLowerCase().includes(p.name.toLowerCase().trim()));

  // Match against leads
  const lead = db.getCollection("leads").find(
    l => l.email && senderEmail && l.email.toLowerCase() === senderNorm
  );

  // Resolve assignee(s)
  let assignees = [], reason, projectId = null, groupName = null;

  if (personalMatch) {
    // Personal task-email token takes HIGHEST priority over everything
    assignees = [personalMatch.userName];
    reason    = `Personal task email (+${personalMatch.token})`;
    if (matchedProject) { projectId = matchedProject.id; groupName = matchedProject.name; }
  } else if (assigneeOverride) {
    // Label-based override
    assignees = [assigneeOverride];
    reason    = labelName ? `Label "${labelName}" assign_to override` : "Label assign_to override";
    if (matchedProject) { projectId = matchedProject.id; groupName = matchedProject.name; }
  } else if (matchedProject) {
    const teamLeader = matchedProject.assigned_to || matchedProject.team_leader || "";
    if (teamLeader) {
      assignees = [teamLeader];
      reason    = `Group match: "${matchedProject.name}" → team leader`;
    } else {
      const r = resolveAssigneeFromRules(senderNorm, subject);
      assignees = r.assignees || [r.assignee];
      reason    = `Group match: "${matchedProject.name}" → ${r.reason}`;
    }
    projectId = matchedProject.id;
    groupName = matchedProject.name;
  } else if (lead?.responsible) {
    assignees = [lead.responsible];
    reason    = "Lead responsible person";
  } else {
    const r = resolveAssigneeFromRules(senderNorm, subject);
    assignees = r.assignees || [r.assignee];
    reason    = r.reason;
  }

  const deadline    = new Date(Date.now() + 86400000).toISOString();
  const labelPrefix = labelName ? `[${labelName}] ` : "";
  const cleanSubject = subject || "(no subject)";
  const taskTitle   = matchedProject
    ? `${labelPrefix}[${matchedProject.name}] ${cleanSubject}`
    : `${labelPrefix}${cleanSubject}`;
  const description = `Email received from: ${from || senderEmail}\nEmail: ${senderEmail || ""}\nSubject: ${subject || ""}\nGroup: ${groupName || "N/A"}\nInbox: ${account.email}\nLabel: ${labelName || "INBOX"}\n\n${body ? body.substring(0, 400) + (body.length > 400 ? "..." : "") : ""}`.trim();
  const priority    = lead?.priority || matchedProject?.priority || "medium";

  // Create one task per assignee (supports both single and multi-person defaults)
  const createdTasks = [];
  for (const assignee of assignees) {
    const task = db.insert("tasks", {
      task_number:    nextTaskNumber(),
      title:          taskTitle,
      description,
      assignee,
      assigned_to:    assignee,
      priority,
      status:         "pending",
      deadline,
      entity_type:    matchedProject ? "project" : lead ? "lead" : "email",
      entity_id:      projectId || lead?.id || "",
      project_id:     projectId || null,
      group_name:     groupName || null,
      created_by:     "System (Auto-Inbox)",
      tags:           ["email", "auto", "inbox", ...(groupName ? ["group"] : []), ...(labelName ? ["label"] : [])],
      source_email:   senderEmail || "",
      source_subject: subject || "",
      mail_label:     labelName || null,
    });

    // Activity log
    if (matchedProject) {
      db.insert("activities", {
        type: "email", title: `Email received: ${subject || "(no subject)"}`,
        description: `Auto-task from inbox. Assigned to ${assignee}`,
        entity_type: "project", entity_id: matchedProject.id,
        assigned_to: assignee, due_date: deadline.split("T")[0],
        due_time: "09:00", completed: false, direction: "incoming",
      });
    }
    if (lead) {
      db.insert("activities", {
        type: "email", title: `Email received: ${subject || "(no subject)"}`,
        description: `Auto-task created and assigned to ${assignee}`,
        entity_type: "lead", entity_id: lead.id,
        assigned_to: assignee, due_date: deadline.split("T")[0],
        due_time: "09:00", completed: false, direction: "incoming",
      });
    }

    // Notification per assignee
    db.insert("notifications", {
      type:        "email_task",
      title:       `New task from inbox${groupName ? ` [${groupName}]` : ""}`,
      message:     `Email from ${from || senderEmail}: "${taskTitle}"`,
      target:      assignee,
      entity_type: "task",
      entity_id:   task.id,
      read:        false,
    });

    console.log(`[Poller] Task created → "${taskTitle.substring(0, 60)}" → ${assignee} (${reason})`);
    createdTasks.push(task);
  }

  return createdTasks[0] || null;
}

// ── Get all CRM email addresses (to skip self-sent emails) ────────────────
function getOwnEmailAddresses() {
  return new Set(
    db.getCollection("mail_accounts")
      .map(a => (a.email || "").toLowerCase().trim())
      .filter(Boolean)
  );
}

// ── Poll a single mail account ─────────────────────────────────────────────
async function pollAccount(account) {
  const client = new ImapFlow({
    host:   account.imap_host,
    port:   account.imap_port,
    secure: account.imap_secure,
    auth:   { user: account.email, pass: account.password },
    logger: false,
    tls:    { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    let newCount = 0;

    // Collect own CRM email addresses so we never create tasks for self-sent mail
    const ownEmails = getOwnEmailAddresses();

    try {
      // ── For Gmail: search Primary category only (skip promotions/updates/social)
      const isGmail = (account.imap_host || "").toLowerCase().includes("gmail") ||
                      (account.imap_host || "").toLowerCase().includes("google");
      let uids;
      if (isGmail) {
        try {
          uids = await client.search({ gmailRaw: "category:primary in:inbox is:unread" }, { uid: true });
          console.log(`[Poller] ${account.email}: Gmail Primary search → ${(uids||[]).length} unseen`);
        } catch {
          uids = await client.search({ seen: false });
        }
      } else {
        uids = await client.search({ seen: false });
      }
      if (!uids || uids.length === 0) {
        console.log(`[Poller] ${account.email}: no new emails`);
        return;
      }

      for (const uid of uids) {
        if (isAlreadyProcessed(account.id, uid)) continue;

        try {
          for await (const msg of client.fetch([uid], {
            uid: true, envelope: true, source: true,
          })) {
            const envelope    = msg.envelope || {};
            const fromAddr    = envelope.from?.[0];
            const from        = fromAddr ? (fromAddr.name || fromAddr.address) : "Unknown";
            const senderEmail = (fromAddr?.address || "").toLowerCase().trim();
            const subject     = envelope.subject || "(no subject)";
            const toAddresses = envelope.to || [];

            // ── Skip emails sent FROM one of our own CRM accounts ──────────
            // This prevents creating tasks for outgoing replies or internal mail
            if (senderEmail && ownEmails.has(senderEmail)) {
              console.log(`[Poller] Skipping self-sent email from ${senderEmail}: "${subject}"`);
              markProcessed(account.id, uid); // mark so we don't recheck it
              continue;
            }

            // Parse body
            let body = "";
            try {
              const parsed = await simpleParser(msg.source);
              body = parsed.text || parsed.html || "";
            } catch {}

            processEmail({ from, senderEmail, subject, body, account, toAddresses });
            markProcessed(account.id, uid);
            newCount++;
          }
        } catch (msgErr) {
          console.error(`[Poller] Error processing UID ${uid} on ${account.email}:`, msgErr.message);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    db.update("mail_accounts", account.id, { last_sync: new Date().toISOString() });
    if (newCount > 0) console.log(`[Poller] ${account.email}: processed ${newCount} new email(s)`);
  } catch (err) {
    console.error(`[Poller] IMAP error for ${account.email}:`, err.message);
    try { await client.logout(); } catch {}
  }
}

// ── Poll a single labeled IMAP folder ─────────────────────────────────────
async function pollLabeledFolder(account, label) {
  const folderPath = label.imap_folder || label.name;
  const client = new ImapFlow({
    host:   account.imap_host,
    port:   account.imap_port,
    secure: account.imap_secure,
    auth:   { user: account.email, pass: account.password },
    logger: false,
    tls:    { rejectUnauthorized: false },
  });

  const processedKey = `${account.id}:${folderPath}`;

  try {
    await client.connect();
    let lock;
    try {
      lock = await client.getMailboxLock(folderPath);
    } catch {
      // folder doesn't exist on server yet — skip silently
      await client.logout();
      return;
    }

    const ownEmails = getOwnEmailAddresses();
    let newCount = 0;
    try {
      const uids = await client.search({ seen: false });
      if (!uids || uids.length === 0) {
        console.log(`[Poller] ${account.email} [${folderPath}]: no new emails`);
        return;
      }

      for (const uid of uids) {
        // Unique key includes folder so INBOX UIDs don't collide with label UIDs
        const dedupKey = `${account.id}:${folderPath}:${uid}`;
        if (db.getCollection("mail_processed_uids").some(r => r.uid === dedupKey)) continue;

        try {
          for await (const msg of client.fetch([uid], {
            uid: true, envelope: true, source: true,
          })) {
            const envelope   = msg.envelope || {};
            const fromAddr   = envelope.from?.[0];
            const from       = fromAddr ? (fromAddr.name || fromAddr.address) : "Unknown";
            const senderEmail = (fromAddr?.address || "").toLowerCase().trim();
            const subject    = envelope.subject || "(no subject)";
            const toAddresses = envelope.to || [];

            // Skip self-sent emails
            if (senderEmail && ownEmails.has(senderEmail)) {
              db.insert("mail_processed_uids", { account_id: account.id, uid: dedupKey, processed_at: new Date().toISOString() });
              continue;
            }

            let body = "";
            try {
              const parsed = await simpleParser(msg.source);
              body = parsed.text || parsed.html || "";
            } catch {}

            processEmail({
              from, senderEmail, subject, body, account, toAddresses,
              assigneeOverride: label.assign_to || null,
              labelName: label.name,
            });

            db.insert("mail_processed_uids", {
              account_id:   account.id,
              uid:          dedupKey,
              processed_at: new Date().toISOString(),
            });
            newCount++;
          }
        } catch (msgErr) {
          console.error(`[Poller] Error processing UID ${uid} in folder ${folderPath}:`, msgErr.message);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    if (newCount > 0) console.log(`[Poller] ${account.email} [${label.name}]: processed ${newCount} new email(s)`);
  } catch (err) {
    console.error(`[Poller] IMAP error for ${account.email} folder ${folderPath}:`, err.message);
    try { await client.logout(); } catch {}
  }
}

// ── Main poll loop (used for manual trigger + labeled folders) ─────────────
async function runPoll() {
  // 1. Poll main inboxes (INBOX folder)
  const mainAccounts = db.getCollection("mail_accounts").filter(a => a.is_main_inbox === true);
  if (mainAccounts.length > 0) {
    for (const account of mainAccounts) {
      await pollAccount(account);
    }
  }

  // 2. Poll labeled folders with auto_task=true
  const autoLabels = db.getCollection("mail_labels").filter(l => l.auto_task === true);
  if (autoLabels.length > 0) {
    for (const label of autoLabels) {
      const account = db.getById("mail_accounts", label.account_id);
      if (!account) continue;
      await pollLabeledFolder(account, label);
    }
  }
}

// ── IMAP IDLE — real-time push watcher per account ─────────────────────────
// Holds a persistent IMAP connection. The moment the server sends a new-mail
// notification (EXISTS), we immediately call pollAccount() to create the task.
// Reconnects automatically if the connection drops or times out (~29 min on Gmail).
async function watchAccountIdle(account) {
  while (true) {
    const client = new ImapFlow({
      host:   account.imap_host,
      port:   account.imap_port,
      secure: account.imap_secure,
      auth:   { user: account.email, pass: account.password },
      logger: false,
      tls:    { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock("INBOX");
      console.log(`[IDLE] ✅ Watching ${account.email} — tasks will be created instantly on new email`);

      try {
        // client.idle() resolves when server sends any notification (new mail, flag change, etc.)
        await client.idle();
        console.log(`[IDLE] 📬 New mail signal received for ${account.email} — creating task now…`);
      } finally {
        lock.release();
      }

      await client.logout();

      // Immediately poll for the new email(s)
      await pollAccount(account);

    } catch (err) {
      console.error(`[IDLE] Connection error for ${account.email}:`, err.message);
      try { await client.logout(); } catch {}
      // Wait 30 seconds before reconnecting so we don't spam on repeated failures
      await new Promise(r => setTimeout(r, 30000));
    }

    // Brief pause before reconnecting IDLE
    await new Promise(r => setTimeout(r, 2000));

    // Re-read account from DB in case it was updated or removed
    const updated = db.getById("mail_accounts", account.id);
    if (!updated || !updated.is_main_inbox) {
      console.log(`[IDLE] Account ${account.email} removed or disabled — stopping watcher`);
      break;
    }
    account = updated;
  }
}

// ── Start: IDLE watchers + safety fallback poll every 5 min ───────────────
function start() {
  // Initial poll after 5 seconds (catches any emails that arrived while server was down)
  setTimeout(runPoll, 5000);

  // Safety net: poll every 5 minutes in case IDLE misses anything
  setInterval(runPoll, POLL_INTERVAL_MS);

  // Start IDLE real-time watchers for all main inbox accounts
  // Re-check every minute for newly connected accounts
  const startIdleWatchers = () => {
    const mainAccounts = db.getCollection("mail_accounts").filter(a => a.is_main_inbox === true);
    mainAccounts.forEach(account => {
      // Only start a watcher if one isn't already running for this account
      if (!activeIdleAccounts.has(account.id)) {
        activeIdleAccounts.add(account.id);
        watchAccountIdle(account).catch(() => {}).finally(() => {
          activeIdleAccounts.delete(account.id);
        });
      }
    });
  };

  // Run immediately then every 60 seconds to pick up newly connected accounts
  startIdleWatchers();
  setInterval(startIdleWatchers, 60000);

  console.log(`[IDLE] Real-time email watcher started — tasks created instantly on new email`);
}

// Track which accounts already have an active IDLE watcher
const activeIdleAccounts = new Set();

module.exports = { start, runPoll, resolveAssigneeFromRules };
