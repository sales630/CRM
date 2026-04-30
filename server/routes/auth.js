const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const db = require("../database");
const logActivity = require("../utils/activityLogger");

const JWT_SECRET = process.env.JWT_SECRET || "backoffice-crm-secret-2026-secure-key";

// ── Simple JWT implementation using built-in crypto ────────────────────────
function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 7,
    })
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(header + "." + body)
    .digest("base64url");
  return header + "." + body + "." + sig;
}

function verifyToken(token) {
  try {
    const [header, body, sig] = token.split(".");
    const expected = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(header + "." + body)
      .digest("base64url");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Password hashing using built-in crypto ─────────────────────────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha256").toString("hex");
  return salt + ":" + hash;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const attempt = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha256").toString("hex");
  return attempt === hash;
}

module.exports.authMiddleware = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.headers["x-auth-token"];
  if (!token) return res.status(401).json({ success: false, error: "Authentication required" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ success: false, error: "Invalid or expired token" });

  // ── Single-session check: verify session_token matches DB ─────────────────
  const userRecord = db.getById("users", payload.id);
  if (!userRecord) return res.status(401).json({ success: false, error: "User not found" });
  if (payload.session_token && userRecord.session_token !== payload.session_token) {
    return res.status(401).json({ success: false, error: "SESSION_INVALIDATED" });
  }

  req.user = payload;
  next();
};

module.exports.requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: "Not authenticated" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    next();
  };

// ── Login ──────────────────────────────────────────────────────────────────
router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: "Email and password required" });
    const users = db.getCollection("users");
    const user = users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase());
    if (!user) return res.status(401).json({ success: false, error: "Invalid email or password" });
    if (user.status === "inactive")
      return res
        .status(403)
        .json({ success: false, error: "Account is inactive. Contact your administrator." });
    // Verify password — handles hashed, legacy plain-text, and first-login fallback
    let passwordOk = false;

    if (user.password_hash) {
      // Normal path — compare against stored hash
      passwordOk = verifyPassword(password, user.password_hash);
    } else if (user.password && user.password.trim()) {
      // Legacy path — plain-text password was saved before the hashing fix
      passwordOk = (password === user.password);
      if (passwordOk) {
        // Auto-migrate: hash it now and clear the plain-text field
        db.update("users", user.id, { password_hash: hashPassword(password), password: null });
      }
    } else {
      // No password set — first-login fallbacks
      passwordOk =
        password === "password123" ||
        password === email.split("@")[0] ||
        password === "admin123";
      if (passwordOk) {
        db.update("users", user.id, { password_hash: hashPassword(password) });
      }
    }
    if (!passwordOk)
      return res.status(401).json({ success: false, error: "Invalid email or password" });

    // ── Single-session: generate a new session token, invalidating any old sessions ──
    const sessionToken = crypto.randomBytes(32).toString("hex");
    db.update("users", user.id, { session_token: sessionToken });

    const token = createToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      session_token: sessionToken,
    });
    const { password_hash, ...safeUser } = user;
    // ── Log the login ──────────────────────────────────────────────────────
    logActivity({
      userId:    user.id,
      userName:  user.name,
      userRole:  user.role,
      action:    "login",
      module:    "auth",
      detail:    `${user.name} (${user.role}) signed in`,
      ip:        req.ip || req.headers["x-forwarded-for"] || "",
    });
    res.json({ success: true, data: { token, user: safeUser } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Get current user ───────────────────────────────────────────────────────
router.get("/me", module.exports.authMiddleware, (req, res) => {
  try {
    const user = db.getById("users", req.user.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, data: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Change password ────────────────────────────────────────────────────────
router.post("/change-password", module.exports.authMiddleware, (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 6)
      return res
        .status(400)
        .json({ success: false, error: "New password must be at least 6 characters" });
    const user = db.getById("users", req.user.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    if (user.password_hash && !verifyPassword(current_password, user.password_hash))
      return res.status(401).json({ success: false, error: "Current password is incorrect" });
    db.update("users", user.id, { password_hash: hashPassword(new_password) });
    res.json({ success: true, data: { message: "Password updated successfully" } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Register (admin only in production — open for setup) ───────────────────
router.post("/register", (req, res) => {
  try {
    const { name, email, password, role = "employee", department = "" } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, error: "Name, email and password required" });
    const users = db.getCollection("users");
    if (users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase()))
      return res.status(409).json({ success: false, error: "Email already registered" });
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const user = db.insert("users", {
      name,
      email,
      role,
      department,
      phone: "",
      avatar: "",
      status: "active",
      password_hash: hashPassword(password),
      session_token: sessionToken,
      task_email_token: crypto.randomBytes(4).toString("hex"), // auto-generated on register
    });
    const { password_hash, ...safeUser } = user;
    const token = createToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      session_token: sessionToken,
    });
    res.status(201).json({ success: true, data: { token, user: safeUser } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Verify token (health check) ────────────────────────────────────────────
router.get("/verify", module.exports.authMiddleware, (req, res) => {
  res.json({ success: true, data: { valid: true, user: req.user } });
});

module.exports.router = router;
