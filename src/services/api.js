/* eslint-disable */
const BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000") + "/api";

function getToken() {
  return localStorage.getItem("crm_token") || "";
}

async function request(method, path, body) {
  const token = getToken();
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, opts);
  } catch (networkErr) {
    throw new Error("Cannot connect to server. Make sure the backend is running on port 5000.");
  }

  let data;
  try {
    data = await res.json();
  } catch (parseErr) {
    throw new Error(`Server error (${res.status}). Make sure the backend server is running.`);
  }

  if (!data.success) {
    // Single-session enforcement: another browser logged in and invalidated this session
    if (data.error === "SESSION_INVALIDATED") {
      window.dispatchEvent(new CustomEvent("session-invalidated"));
    }
    throw new Error(data.error || "API Error");
  }
  return data.data;
}

// ── File Upload (Base64) ───────────────────────────────────────────────────
export function uploadFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const result = await request("POST", "/upload", {
          fileName: file.name,
          fileType: file.type,
          fileData: e.target.result, // base64 string with data prefix
          fileSize: file.size,
        });
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file); // produces base64 with "data:...;base64,..." prefix
  });
}

export const FILE_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => request("POST", "/auth/login", { email, password }),
  register: (data) => request("POST", "/auth/register", data),
  me: () => request("GET", "/auth/me"),
  changePassword: (current_password, new_password) =>
    request("POST", "/auth/change-password", { current_password, new_password }),
  verify: () => request("GET", "/auth/verify"),
};

// ── Leads ──────────────────────────────────────────────────────────────────
export const leadsAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request("GET", `/leads${qs ? `?${qs}` : ""}`);
  },
  getById: (id) => request("GET", `/leads/${id}`),
  create: (data) => request("POST", "/leads", data),
  update: (id, data) => request("PUT", `/leads/${id}`, data),
  updateStage: (id, stage) => request("PATCH", `/leads/${id}/stage`, { stage }),
  delete: (id) => request("DELETE", `/leads/${id}`),
  bulkDelete: (ids) => request("DELETE", "/leads", { ids }),
  getStats: () => request("GET", "/leads/stats/summary"),
};

// ── Deals ──────────────────────────────────────────────────────────────────
export const dealsAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request("GET", `/deals${qs ? `?${qs}` : ""}`);
  },
  getById: (id) => request("GET", `/deals/${id}`),
  create: (data) => request("POST", "/deals", data),
  update: (id, data) => request("PUT", `/deals/${id}`, data),
  updateStage: (id, stage) => request("PATCH", `/deals/${id}/stage`, { stage }),
  delete: (id) => request("DELETE", `/deals/${id}`),
  getStats: () => request("GET", "/deals/stats/summary"),
};

// ── Contacts ───────────────────────────────────────────────────────────────
export const contactsAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request("GET", `/contacts${qs ? `?${qs}` : ""}`);
  },
  getById: (id) => request("GET", `/contacts/${id}`),
  create: (data) => request("POST", "/contacts", data),
  update: (id, data) => request("PUT", `/contacts/${id}`, data),
  delete: (id) => request("DELETE", `/contacts/${id}`),
};

// ── Companies ──────────────────────────────────────────────────────────────
export const companiesAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request("GET", `/companies${qs ? `?${qs}` : ""}`);
  },
  getById: (id) => request("GET", `/companies/${id}`),
  create: (data) => request("POST", "/companies", data),
  update: (id, data) => request("PUT", `/companies/${id}`, data),
  delete: (id) => request("DELETE", `/companies/${id}`),
};

// ── Activities ─────────────────────────────────────────────────────────────
export const activitiesAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request("GET", `/activities${qs ? `?${qs}` : ""}`);
  },
  create: (data) => request("POST", "/activities", data),
  update: (id, data) => request("PUT", `/activities/${id}`, data),
  complete: (id) => request("PATCH", `/activities/${id}/complete`, {}),
  uncomplete: (id) => request("PATCH", `/activities/${id}/uncomplete`, {}),
  delete: (id) => request("DELETE", `/activities/${id}`),
  addComment: (data) => request("POST", "/activities/comments", data),
};

// ── Analytics ──────────────────────────────────────────────────────────────
export const analyticsAPI = {
  getOverview: () => request("GET", "/analytics/overview"),
};

export default { leadsAPI, dealsAPI, contactsAPI, companiesAPI, activitiesAPI, analyticsAPI };

// ── Products ───────────────────────────────────────────────────────────────
export const productsAPI = {
  getAll: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/products${qs ? `?${qs}` : ""}`); },
  getById: (id) => request("GET", `/products/${id}`),
  create: (data) => request("POST", "/products", data),
  update: (id, data) => request("PUT", `/products/${id}`, data),
  delete: (id) => request("DELETE", `/products/${id}`),
};

// ── Invoices ───────────────────────────────────────────────────────────────
export const invoicesAPI = {
  getAll: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/invoices${qs ? `?${qs}` : ""}`); },
  getById: (id) => request("GET", `/invoices/${id}`),
  create: (data) => request("POST", "/invoices", data),
  update: (id, data) => request("PUT", `/invoices/${id}`, data),
  updateStatus: (id, status) => request("PATCH", `/invoices/${id}/status`, { status }),
  delete: (id) => request("DELETE", `/invoices/${id}`),
  getStats: () => request("GET", "/invoices/stats"),
};

// ── Quotes ─────────────────────────────────────────────────────────────────
export const quotesAPI = {
  getAll: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/quotes${qs ? `?${qs}` : ""}`); },
  getById: (id) => request("GET", `/quotes/${id}`),
  create: (data) => request("POST", "/quotes", data),
  update: (id, data) => request("PUT", `/quotes/${id}`, data),
  updateStatus: (id, status) => request("PATCH", `/quotes/${id}/status`, { status }),
  delete: (id) => request("DELETE", `/quotes/${id}`),
};

// ── Tasks ──────────────────────────────────────────────────────────────────
export const tasksAPI = {
  getAll: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/tasks${qs ? `?${qs}` : ""}`); },
  getById: (id) => request("GET", `/tasks/${id}`),
  getStats: () => request("GET", "/tasks/stats"),
  create: (data) => request("POST", "/tasks", data),
  update: (id, data) => request("PUT", `/tasks/${id}`, data),
  updateStatus: (id, status) => request("PATCH", `/tasks/${id}/status`, { status }),
  delete: (id) => request("DELETE", `/tasks/${id}`),
  // Time logs
  getTimeLogs: (id) => request("GET", `/tasks/${id}/time-logs`),
  logTime: (id, data) => request("POST", `/tasks/${id}/time-logs`, data),
  updateTimeLog: (id, logId, data) => request("PATCH", `/tasks/${id}/time-logs/${logId}`, data),
  deleteTimeLog: (id, logId) => request("DELETE", `/tasks/${id}/time-logs/${logId}`),
  // Comments
  addComment: (id, data) => request("POST", `/tasks/${id}/comments`, data),
  deleteComment: (id, cid) => request("DELETE", `/tasks/${id}/comments/${cid}`),
  // Email rules
  getEmailRules: () => request("GET", "/tasks/email-rules"),
  createEmailRule: (data) => request("POST", "/tasks/email-rules", data),
  updateEmailRule: (id, data) => request("PUT", `/tasks/email-rules/${id}`, data),
  deleteEmailRule: (id) => request("DELETE", `/tasks/email-rules/${id}`),
  convertFromEmail: (data) => request("POST", "/tasks/from-email", data),
};

// ── Users ──────────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/users${qs ? `?${qs}` : ""}`); },
  getById: (id) => request("GET", `/users/${id}`),
  create: (data) => request("POST", "/users", data),
  update: (id, data) => request("PUT", `/users/${id}`, data),
  updateRole: (id, role) => request("PATCH", `/users/${id}/role`, { role }),
  delete: (id) => request("DELETE", `/users/${id}`),
  generateTaskEmailToken: (id) => request("POST", `/users/${id}/task-email-token`),
};

// ── Chat ───────────────────────────────────────────────────────────────────
export const chatAPI = {
  getRooms: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/chat/rooms${qs ? `?${qs}` : ""}`); },
  createRoom: (data) => request("POST", "/chat/rooms", data),
  findOrCreateDirect: (data) => request("POST", "/chat/rooms/direct", data),
  joinRoom: (id, data) => request("POST", `/chat/rooms/${id}/join`, data),
  updateRoom: (id, data) => request("PUT", `/chat/rooms/${id}`, data),
  deleteRoom: (id) => request("DELETE", `/chat/rooms/${id}`),
  getMessages: (roomId, params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/chat/rooms/${roomId}/messages${qs ? `?${qs}` : ""}`); },
  sendMessage: (roomId, data) => request("POST", `/chat/rooms/${roomId}/messages`, data),
  editMessage: (msgId, data) => request("PUT", `/chat/messages/${msgId}`, data),
  markRead: (msgId, data) => request("PATCH", `/chat/messages/${msgId}/read`, data),
  markRoomRead: (roomId, userName) => request("POST", `/chat/rooms/${roomId}/read`, { userName }),
  deleteMessage: (msgId) => request("DELETE", `/chat/messages/${msgId}`),
};

// ── Notifications ──────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/notifications${qs ? `?${qs}` : ""}`); },
  getLogs: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/notifications/logs${qs ? `?${qs}` : ""}`); },
  create: (data) => request("POST", "/notifications", data),
  markRead: (id) => request("PATCH", `/notifications/${id}/read`, {}),
  markAllRead: () => request("PATCH", "/notifications/read-all", {}),
  delete: (id) => request("DELETE", `/notifications/${id}`),
};

// ── Projects & Rules ───────────────────────────────────────────────────────
export const projectsAPI = {
  // Projects
  getAll: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/projects${qs ? `?${qs}` : ""}`); },
  getById: (id) => request("GET", `/projects/${id}`),
  create: (data) => request("POST", "/projects", data),
  update: (id, data) => request("PUT", `/projects/${id}`, data),
  delete: (id) => request("DELETE", `/projects/${id}`),
  // Rules
  getRules: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/projects/rules/all${qs ? `?${qs}` : ""}`); },
  createRule: (data) => request("POST", "/projects/rules", data),
  updateRule: (id, data) => request("PUT", `/projects/rules/${id}`, data),
  deleteRule: (id) => request("DELETE", `/projects/rules/${id}`),
  publishRules: () => request("POST", "/projects/rules/publish", {}),
  matchRule: (data) => request("POST", "/projects/rules/match", data),
  getRulesStats: () => request("GET", "/projects/rules/stats"),
};

// ── Control Panel ──────────────────────────────────────────────────────────
export const controlPanelAPI = {
  getPerformance: () => request("GET", "/control-panel/performance"),
  getSettings: () => request("GET", "/control-panel/settings"),
  updateSettings: (data) => request("PUT", "/control-panel/settings", data),
  getLoginHistory: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/control-panel/login-history${qs ? `?${qs}` : ""}`); },
  getUserGroups: () => request("GET", "/control-panel/user-groups"),
  createUserGroup: (data) => request("POST", "/control-panel/user-groups", data),
  updateUserGroup: (id, data) => request("PUT", `/control-panel/user-groups/${id}`, data),
  deleteUserGroup: (id) => request("DELETE", `/control-panel/user-groups/${id}`),
  getSessions: () => request("GET", "/control-panel/sessions"),
  deleteSession: (id) => request("DELETE", `/control-panel/sessions/${id}`),
  clearCache: () => request("POST", "/control-panel/clear-cache", {}),
};

// ── Time Management ────────────────────────────────────────────────────────
export const timemanAPI = {
  clockIn: (data) => request("POST", "/timeman/clockin", data),
  clockOut: (data) => request("POST", "/timeman/clockout", data),
  myStatus: () => request("GET", "/timeman/mystatus"),
  getOnlineUsers: () => request("GET", "/timeman/online"),
  getStats: () => request("GET", "/timeman/stats"),
  getWorktime: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/timeman/worktime${qs ? `?${qs}` : ""}`); },
  getUserWorktime: (userId) => request("GET", `/timeman/worktime/${userId}`),
  getTimeReport: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/timeman/time-report${qs ? `?${qs}` : ""}`); },
  updateRecord: (id, data) => request("PUT", `/timeman/records/${id}`, data),
  // Work Reports
  getReports: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/timeman/reports${qs ? `?${qs}` : ""}`); },
  submitReport: (data) => request("POST", "/timeman/reports", data),
  scoreReport: (id, data) => request("PATCH", `/timeman/reports/${id}/score`, data),
  deleteReport: (id) => request("DELETE", `/timeman/reports/${id}`),
  // Work Schedules
  getSchedules: () => request("GET", "/timeman/schedules"),
  createSchedule: (data) => request("POST", "/timeman/schedules", data),
  updateSchedule: (id, data) => request("PUT", `/timeman/schedules/${id}`, data),
  deleteSchedule: (id) => request("DELETE", `/timeman/schedules/${id}`),
  // Absences
  getAbsences: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/timeman/absences${qs ? `?${qs}` : ""}`); },
  addAbsence: (data) => request("POST", "/timeman/absences", data),
  deleteAbsence: (id) => request("DELETE", `/timeman/absences/${id}`),
};

// ── Mail Accounts (IMAP/SMTP) ──────────────────────────────────────────────
export const mailAccountsAPI = {
  getAccounts: () => request("GET", "/mail/accounts"),
  connect: (data) => request("POST", "/mail/accounts", data),
  update: (id, data) => request("PUT", `/mail/accounts/${id}`, data),
  disconnect: (id) => request("DELETE", `/mail/accounts/${id}`),
  fetchEmails: (accountId, params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/mail/fetch/${accountId}${qs ? `?${qs}` : ""}`); },
  fetchBody: (accountId, uid, folder = "INBOX") => request("GET", `/mail/body/${accountId}/${uid}?folder=${encodeURIComponent(folder)}`),
  getFolders: (accountId) => request("GET", `/mail/folders/${accountId}`),
  sendEmail: (accountId, data) => request("POST", `/mail/send/${accountId}`, data),
  flagEmail: (accountId, data) => request("PATCH", `/mail/flag/${accountId}`, data),
  getProviders: () => request("GET", "/mail/providers"),
  createTaskFromEmail: (data) => request("POST", "/mail/email-task", data),
  pollNow: () => request("POST", "/mail/poll-now"),
};

// ── Mail Assignment Rules ──────────────────────────────────────────────────
export const mailRulesAPI = {
  getAll:   ()          => request("GET",    "/mail/rules"),
  create:   (data)      => request("POST",   "/mail/rules",        data),
  update:   (id, data)  => request("PUT",    `/mail/rules/${id}`,  data),
  delete:   (id)        => request("DELETE", `/mail/rules/${id}`),
  reorder:  (ids)       => request("POST",   "/mail/rules/reorder", { ids }),
};

export const mailLabelsAPI = {
  getForAccount: (accountId) => request("GET",    `/mail/labels/account/${accountId}`),
  getMine:       ()           => request("GET",    "/mail/labels/mine"),
  create:        (data)       => request("POST",   "/mail/labels",        data),
  update:        (id, data)   => request("PUT",    `/mail/labels/${id}`,  data),
  delete:        (id)         => request("DELETE", `/mail/labels/${id}`),
  reorder:       (ids)        => request("POST",   "/mail/labels/reorder", { ids }),
};

// ── Reports ────────────────────────────────────────────────────────────────
export const reportsAPI = {
  getWorkSummary: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/reports/work-summary${qs ? `?${qs}` : ""}`); },
  getCRMOverview: () => request("GET", "/reports/crm-overview"),
  getScheduled: () => request("GET", "/reports/scheduled"),
  createScheduled: (data) => request("POST", "/reports/scheduled", data),
  updateScheduled: (id, data) => request("PUT", `/reports/scheduled/${id}`, data),
  deleteScheduled: (id) => request("DELETE", `/reports/scheduled/${id}`),
};

// ── Task Automation ─────────────────────────────────────────────────────────
export const automationAPI = {
  // Rules
  getRules: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/automation/rules${qs ? `?${qs}` : ""}`); },
  createRule: (data) => request("POST", "/automation/rules", data),
  updateRule: (id, data) => request("PUT", `/automation/rules/${id}`, data),
  deleteRule: (id) => request("DELETE", `/automation/rules/${id}`),
  toggleRule: (id) => request("POST", `/automation/rules/${id}/toggle`),
  testRule: (id, data) => request("POST", `/automation/rules/${id}/test`, data),
  // Templates
  getTemplates: () => request("GET", "/automation/templates"),
  createTemplate: (data) => request("POST", "/automation/templates", data),
  updateTemplate: (id, data) => request("PUT", `/automation/templates/${id}`, data),
  deleteTemplate: (id) => request("DELETE", `/automation/templates/${id}`),
  applyTemplate: (id, data) => request("POST", `/automation/templates/${id}/apply`, data),
  // Logs & Stats
  getLogs: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/automation/logs${qs ? `?${qs}` : ""}`); },
  getStats: () => request("GET", "/automation/stats"),
  trigger: (data) => request("POST", "/automation/trigger", data),
  processPending: () => request("POST", "/automation/process-pending"),
};

// ── DevOps / Webhooks ───────────────────────────────────────────────────────
export const devopsAPI = {
  // Webhooks CRUD
  getWebhooks: () => request("GET", "/devops/webhooks"),
  getWebhook: (id) => request("GET", `/devops/webhooks/${id}`),
  createWebhook: (data) => request("POST", "/devops/webhooks", data),
  updateWebhook: (id, data) => request("PUT", `/devops/webhooks/${id}`, data),
  deleteWebhook: (id) => request("DELETE", `/devops/webhooks/${id}`),
  regenerateToken: (id) => request("POST", `/devops/webhooks/${id}/regenerate`),
  testWebhook: (id, data = {}) => request("POST", `/devops/webhooks/${id}/test`, data),
  // Logs & Stats
  getLogs: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/devops/logs${qs ? `?${qs}` : ""}`); },
  getStats: () => request("GET", "/devops/stats"),
};

// ── Stream / Social Feed ──────────────────────────────────────────────────
export const streamAPI = {
  getPosts:    (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/stream/posts${qs ? `?${qs}` : ""}`); },
  createPost:  (data) => request("POST", "/stream/posts", data),
  likePost:    (id)   => request("POST", `/stream/posts/${id}/like`, {}),
  addComment:  (id, data) => request("POST", `/stream/posts/${id}/comments`, data),
  vote:        (id, data) => request("POST", `/stream/posts/${id}/vote`, data),
  deletePost:  (id)   => request("DELETE", `/stream/posts/${id}`),
  viewPost:    (id)   => request("PATCH", `/stream/posts/${id}/view`, {}),
  getBirthdays:() => request("GET", "/stream/birthdays"),
  getPopular:  () => request("GET", "/stream/popular"),
};

// ── HR Structure ────────────────────────────────────────────────────────────
export const hrAPI = {
  // Departments
  getDepartments: () => request("GET", "/hr/departments"),
  createDepartment: (data) => request("POST", "/hr/departments", data),
  updateDepartment: (id, data) => request("PUT", `/hr/departments/${id}`, data),
  deleteDepartment: (id) => request("DELETE", `/hr/departments/${id}`),
  // Employees
  getEmployees: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/hr/employees${qs ? `?${qs}` : ""}`); },
  getEmployee: (id) => request("GET", `/hr/employees/${id}`),
  createEmployee: (data) => request("POST", "/hr/employees", data),
  updateEmployee: (id, data) => request("PUT", `/hr/employees/${id}`, data),
  deleteEmployee: (id) => request("DELETE", `/hr/employees/${id}`),
  // Tree
  getTree: () => request("GET", "/hr/tree"),
  getStats: () => request("GET", "/hr/stats"),
  seed: () => request("POST", "/hr/seed", {}),
  clearAll: () => request("POST", "/hr/clear-all", {}),
  getAssignee: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/hr/assignee${qs ? `?${qs}` : ""}`); },
};

// ── Workgroups ───────────────────────────────────────────────────────────────
export const workgroupsAPI = {
  getAll:   (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/workgroups${qs ? `?${qs}` : ""}`); },
  getById:  (id) => request("GET", `/workgroups/${id}`),
  create:   (data) => request("POST", "/workgroups", data),
  update:   (id, data) => request("PUT", `/workgroups/${id}`, data),
  join:     (id) => request("POST", `/workgroups/${id}/join`, {}),
  delete:   (id) => request("DELETE", `/workgroups/${id}`),
  // Stages
  getStages:    (id) => request("GET", `/workgroups/${id}/stages`),
  updateStages: (id, stages) => request("PUT", `/workgroups/${id}/stages`, { stages }),
  // Tasks
  getTasks:    (id) => request("GET", `/workgroups/${id}/tasks`),
  createTask:  (id, data) => request("POST", `/workgroups/${id}/tasks`, data),
  updateTask:  (id, taskId, data) => request("PUT", `/workgroups/${id}/tasks/${taskId}`, data),
  moveTask:    (id, taskId, stage_id) => request("PATCH", `/workgroups/${id}/tasks/${taskId}/stage`, { stage_id }),
  deleteTask:  (id, taskId) => request("DELETE", `/workgroups/${id}/tasks/${taskId}`),
  // Automation triggers
  getTriggers:    (id) => request("GET", `/workgroups/${id}/automation/triggers`),
  createTrigger:  (id, data) => request("POST", `/workgroups/${id}/automation/triggers`, data),
  deleteTrigger:  (id, triggerId) => request("DELETE", `/workgroups/${id}/automation/triggers/${triggerId}`),
  // Automation rules
  getAutomationRules:    (id) => request("GET", `/workgroups/${id}/automation/rules`),
  createAutomationRule:  (id, data) => request("POST", `/workgroups/${id}/automation/rules`, data),
  updateAutomationRule:  (id, ruleId, data) => request("PUT", `/workgroups/${id}/automation/rules/${ruleId}`, data),
  deleteAutomationRule:  (id, ruleId) => request("DELETE", `/workgroups/${id}/automation/rules/${ruleId}`),
  // Feed & Seed
  getActivity: (id) => request("GET",  `/workgroups/${id}/activity`),
  seed:        (id) => request("POST", `/workgroups/${id}/seed`, {}),
};


// ── Role Permissions ─────────────────────────────────────────────────────────
export const rolePermissionsAPI = {
  getAll:  () => request("GET", "/role-permissions"),
  update:  (role, modules) => request("PUT", `/role-permissions/${role}`, { modules }),
};

// ── Workflows ────────────────────────────────────────────────────────────────
export const workflowsAPI = {
  getAll:    (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/workflows${qs ? `?${qs}` : ""}`); },
  create:    (data)        => request("POST",   "/workflows",                data),
  update:    (id, data)    => request("PUT",    `/workflows/${id}`,          data),
  delete:    (id)          => request("DELETE", `/workflows/${id}`),
  startRun:  (id, data)    => request("POST",   `/workflows/${id}/run`,      data),
  getRuns:   (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/workflows/runs${qs ? `?${qs}` : ""}`); },
  getRun:    (runId)       => request("GET",    `/workflows/runs/${runId}`),
  advance:   (runId, data) => request("PATCH",  `/workflows/runs/${runId}/advance`, data),
  cancel:    (runId)       => request("PATCH",  `/workflows/runs/${runId}/cancel`,  {}),
};

// ── Activity Logs ────────────────────────────────────────────────────────────
export const activityLogsAPI = {
  getAll:  (params = {}) => { const qs = new URLSearchParams(params).toString(); return request("GET", `/activity-logs${qs ? `?${qs}` : ""}`); },
  clear:   () => request("DELETE", "/activity-logs/clear"),
};


// ── Client Payment Limits ────────────────────────────────────────────────────
export const clientLimitsAPI = {
  getAll:          ()           => request("GET",    "/client-limits"),
  getClients:      ()           => request("GET",    "/client-limits/clients"),
  getLabelClients: ()           => request("GET",    "/client-limits/label-clients"),
  create:          (data)       => request("POST",   "/client-limits",                data),
  update:          (id, data)   => request("PUT",    `/client-limits/${id}`,          data),
  delete:          (id)         => request("DELETE", `/client-limits/${id}`),
  checkLimits:     ()           => request("POST",   "/client-limits/check",          {}),
  syncFromLabels:  (defaults)   => request("POST",   "/client-limits/sync-from-labels", defaults || {}),
};
