/**
 * Activity Logger — centralised audit trail for all user actions.
 * Every call inserts one record into the `activity_logs` collection.
 */
const db = require("../database");

/**
 * @param {object} opts
 * @param {string} opts.userId     — performer's DB id
 * @param {string} opts.userName   — performer's display name
 * @param {string} opts.userRole   — performer's role
 * @param {string} opts.action     — verb: "login","create","update","delete","complete","assign","comment","log_time",…
 * @param {string} opts.module     — "task","lead","deal","contact","user","mail","comment","time",…
 * @param {string} [opts.entityId]
 * @param {string} [opts.entityTitle]
 * @param {string} [opts.detail]   — human-readable sentence
 * @param {string} [opts.ip]
 */
function logActivity({ userId, userName, userRole, action, module: mod, entityId, entityTitle, detail, ip } = {}) {
  try {
    db.insert("activity_logs", {
      user_id:      userId   || "",
      user_name:    userName || "System",
      user_role:    userRole || "",
      action,
      module:       mod      || "",
      entity_id:    entityId || "",
      entity_title: entityTitle || "",
      detail:       detail   || "",
      ip:           ip       || "",
    });
  } catch (e) {
    // Never crash the main request because of logging
    console.error("[activityLogger] failed to log:", e.message);
  }
}

module.exports = logActivity;
