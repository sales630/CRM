/* eslint-disable */
const express = require("express");
const router  = express.Router();
const db      = require("../database");
const { authMiddleware } = require("./auth");

// ── GET posts feed ────────────────────────────────────────────────────────
router.get("/posts", authMiddleware, (req, res) => {
  try {
    const { limit = 50, type, author } = req.query;
    let posts = db.getCollection("stream_posts");
    if (type)   posts = posts.filter(p => p.type === type);
    if (author) posts = posts.filter(p => p.author === author);
    posts = posts
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, parseInt(limit))
      .map(p => ({
        ...p,
        comments:    typeof p.comments    === "string" ? JSON.parse(p.comments    || "[]") : (p.comments    || []),
        liked_by:    typeof p.liked_by    === "string" ? JSON.parse(p.liked_by    || "[]") : (p.liked_by    || []),
        poll_options: typeof p.poll_options === "string" ? JSON.parse(p.poll_options || "[]") : (p.poll_options || []),
        attendees:   typeof p.attendees   === "string" ? JSON.parse(p.attendees   || "[]") : (p.attendees   || []),
        tasks:       typeof p.tasks       === "string" ? JSON.parse(p.tasks       || "[]") : (p.tasks       || []),
      }));
    res.json({ success: true, data: posts });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── POST create post ──────────────────────────────────────────────────────
router.post("/posts", authMiddleware, (req, res) => {
  try {
    const {
      type = "post", content, image = null,
      event_date, event_time, location,
      attendees = [], poll_options = [],
      tasks = [], report_period,
    } = req.body;
    if (!content && type === "post")
      return res.json({ success: false, error: "Content required" });

    const post = db.insert("stream_posts", {
      type,
      author:      req.user.name,
      author_id:   String(req.user.id),
      role:        req.user.role || "",
      content:     content || "",
      image:       image || null,
      event_date:  event_date || null,
      event_time:  event_time || null,
      location:    location || null,
      attendees:   JSON.stringify(Array.isArray(attendees) ? attendees : []),
      poll_options: JSON.stringify(Array.isArray(poll_options)
        ? poll_options.map(o => ({ text: o.text || o, votes: 0, voters: [] }))
        : []),
      tasks:       JSON.stringify(Array.isArray(tasks) ? tasks : []),
      report_period: report_period || null,
      liked_by:    JSON.stringify([]),
      likes:       0,
      comments:    JSON.stringify([]),
      views:       0,
    });
    res.status(201).json({ success: true, data: post });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── POST toggle like ──────────────────────────────────────────────────────
router.post("/posts/:id/like", authMiddleware, (req, res) => {
  try {
    const post = db.getById("stream_posts", req.params.id);
    if (!post) return res.json({ success: false, error: "Not found" });
    const likedBy = typeof post.liked_by === "string" ? JSON.parse(post.liked_by || "[]") : (post.liked_by || []);
    const userId  = String(req.user.id);
    const alreadyLiked = likedBy.includes(userId);
    const updated_liked_by = alreadyLiked
      ? likedBy.filter(id => id !== userId)
      : [...likedBy, userId];
    const updated = db.update("stream_posts", req.params.id, {
      liked_by: JSON.stringify(updated_liked_by),
      likes:    updated_liked_by.length,
    });
    res.json({ success: true, data: { liked: !alreadyLiked, likes: updated_liked_by.length } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── POST add comment ──────────────────────────────────────────────────────
router.post("/posts/:id/comments", authMiddleware, (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.json({ success: false, error: "Text required" });
    const post = db.getById("stream_posts", req.params.id);
    if (!post) return res.json({ success: false, error: "Not found" });
    const comments = typeof post.comments === "string" ? JSON.parse(post.comments || "[]") : (post.comments || []);
    const comment = {
      id:        Date.now(),
      author:    req.user.name,
      author_id: String(req.user.id),
      text,
      created_at: new Date().toISOString(),
      likes:     0,
    };
    comments.push(comment);
    db.update("stream_posts", req.params.id, { comments: JSON.stringify(comments) });
    res.json({ success: true, data: comment });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── POST poll vote ────────────────────────────────────────────────────────
router.post("/posts/:id/vote", authMiddleware, (req, res) => {
  try {
    const { option_index } = req.body;
    const post = db.getById("stream_posts", req.params.id);
    if (!post) return res.json({ success: false, error: "Not found" });
    const opts = typeof post.poll_options === "string" ? JSON.parse(post.poll_options || "[]") : (post.poll_options || []);
    const userId = String(req.user.id);
    // Remove previous vote
    opts.forEach(o => { o.voters = (o.voters || []).filter(v => v !== userId); o.votes = o.voters.length; });
    // Add new vote
    if (opts[option_index]) {
      opts[option_index].voters.push(userId);
      opts[option_index].votes = opts[option_index].voters.length;
    }
    db.update("stream_posts", req.params.id, { poll_options: JSON.stringify(opts) });
    res.json({ success: true, data: { poll_options: opts, voted_option: option_index } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── DELETE post ────────────────────────────────────────────────────────────
router.delete("/posts/:id", authMiddleware, (req, res) => {
  try {
    const post = db.getById("stream_posts", req.params.id);
    if (!post) return res.json({ success: false, error: "Not found" });
    if (String(post.author_id) !== String(req.user.id) && !["admin","super_admin"].includes(req.user.role))
      return res.json({ success: false, error: "Not authorized" });
    db.delete("stream_posts", req.params.id);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── GET birthdays (users with birth_date) ─────────────────────────────────
router.get("/birthdays", authMiddleware, (req, res) => {
  try {
    const users = db.getCollection("users");
    const today = new Date();
    const month = today.getMonth() + 1;
    const day   = today.getDate();

    const upcoming = users
      .filter(u => u.birth_date)
      .map(u => {
        const d = new Date(u.birth_date);
        return {
          user_id: u.id,
          name:    u.name,
          date:    `${d.toLocaleString("en-US", { month: "long" })} ${d.getDate()}`,
          month:   d.getMonth() + 1,
          day:     d.getDate(),
        };
      })
      .sort((a, b) => {
        const aNext = (a.month * 100 + a.day < month * 100 + day) ? a.month * 100 + a.day + 1200 : a.month * 100 + a.day;
        const bNext = (b.month * 100 + b.day < month * 100 + day) ? b.month * 100 + b.day + 1200 : b.month * 100 + b.day;
        return aNext - bNext;
      })
      .slice(0, 8);
    res.json({ success: true, data: upcoming });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── GET popular posts (most viewed/liked) ─────────────────────────────────
router.get("/popular", authMiddleware, (req, res) => {
  try {
    const posts = db.getCollection("stream_posts")
      .map(p => ({
        id:      p.id,
        title:   (p.content || "").substring(0, 60) + ((p.content || "").length > 60 ? "…" : ""),
        author:  p.author,
        views:   p.views || 0,
        likes:   p.likes || 0,
        score:   (p.views || 0) + (p.likes || 0) * 3,
        created_at: p.created_at,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    res.json({ success: true, data: posts });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── PATCH increment view count ────────────────────────────────────────────
router.patch("/posts/:id/view", authMiddleware, (req, res) => {
  try {
    const post = db.getById("stream_posts", req.params.id);
    if (!post) return res.json({ success: false, error: "Not found" });
    db.update("stream_posts", req.params.id, { views: (post.views || 0) + 1 });
    res.json({ success: true });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

module.exports = router;
