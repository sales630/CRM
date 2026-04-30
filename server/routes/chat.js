const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../database");

// ── Rooms ──────────────────────────────────────────────────────────────────
router.get("/rooms", (req, res) => {
  try {
    const { user, userName } = req.query;
    // read_by stores user names, so use userName for unread check when available
    const readUser = userName || user;
    let rooms = db.getCollection("chat_rooms");
    if (user) {
      rooms = rooms.filter((r) => {
        const members = typeof r.members === "string" ? JSON.parse(r.members || "[]") : (r.members || []);
        if (members.map(String).includes(String(user)) || r.type === "general") return true;
        // Also check participant_names — old rooms may have user in participant_names but not in members array
        const pn = typeof r.participant_names === "string" ? JSON.parse(r.participant_names || "{}") : (r.participant_names || {});
        if (Object.keys(pn).map(String).includes(String(user))) {
          // Auto-repair: add user to members so future fetches find it normally
          const updatedMembers = [...new Set([...members.map(String), String(user)])];
          db.update("chat_rooms", r.id, { members: JSON.stringify(updatedMembers) });
          return true;
        }
        return false;
      });
    }
    const messages = db.getCollection("chat_messages");
    rooms = rooms.map((r) => {
      const roomMsgs = messages
        .filter((m) => m.room_id === r.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const last = roomMsgs[0] || null;
      const unread = roomMsgs.filter((m) => {
        if (!m.read_by) return true;
        const rb = typeof m.read_by === "string" ? JSON.parse(m.read_by || "[]") : m.read_by || [];
        return !rb.includes(readUser);
      }).length;
      return {
        ...r,
        members: typeof r.members === "string" ? JSON.parse(r.members || "[]") : r.members || [],
        participant_names: typeof r.participant_names === "string" ? JSON.parse(r.participant_names || "{}") : (r.participant_names || {}),
        last_message: last ? last.text || "" : "",
        last_message_time: last ? last.created_at : r.created_at,
        unread_count: unread,
      };
    });
    res.json({ success: true, data: rooms });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Find or create a direct message room between exactly two users
router.post("/rooms/direct", (req, res) => {
  try {
    const { userAId, userBId, userAName, userBName } = req.body;
    if (!userAId || !userBId) return res.status(400).json({ success: false, error: "Both user IDs required" });

    const allRooms = db.getCollection("chat_rooms");
    // Find existing DM between exactly these two users
    const existing = allRooms.find((r) => {
      if (r.type !== "direct") return false;
      const members = typeof r.members === "string" ? JSON.parse(r.members || "[]") : (r.members || []);
      const strMembers = members.map(String);
      return strMembers.includes(String(userAId)) && strMembers.includes(String(userBId)) && strMembers.length === 2;
    });

    if (existing) {
      const members = typeof existing.members === "string" ? JSON.parse(existing.members || "[]") : (existing.members || []);
      return res.json({ success: true, data: { ...existing, members } });
    }

    // Create new DM room
    const room = db.insert("chat_rooms", {
      name: `dm_${userAId}_${userBId}`, // internal key — frontend computes display name
      type: "direct",
      members: JSON.stringify([String(userAId), String(userBId)]),
      description: "",
      avatar: "",
      participant_names: JSON.stringify({ [String(userAId)]: userAName, [String(userBId)]: userBName }),
    });
    res.status(201).json({ success: true, data: { ...room, members: [String(userAId), String(userBId)] } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/rooms", (req, res) => {
  try {
    const { name, type = "group", members = [], description = "", participant_names = {} } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Name required" });
    const strMembers = (Array.isArray(members) ? members : []).map(String);
    const room = db.insert("chat_rooms", {
      name,
      type,
      members: JSON.stringify(strMembers),
      description,
      avatar: "",
      participant_names: JSON.stringify(participant_names),
    });
    res.status(201).json({ success: true, data: { ...room, members: strMembers } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Repair room: ensure a user is in the members list ─────────────────────
router.post("/rooms/:id/join", (req, res) => {
  try {
    const { userId, userName } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: "userId required" });
    const room = db.getById("chat_rooms", req.params.id);
    if (!room) return res.status(404).json({ success: false, error: "Room not found" });
    const members = typeof room.members === "string" ? JSON.parse(room.members || "[]") : (room.members || []);
    const strMembers = members.map(String);
    if (strMembers.includes(String(userId))) {
      return res.json({ success: true, data: { ...room, members: strMembers } });
    }
    // Add user to members
    const updatedMembers = [...strMembers, String(userId)];
    // Also update participant_names if userName provided
    const pn = typeof room.participant_names === "string" ? JSON.parse(room.participant_names || "{}") : (room.participant_names || {});
    if (userName) pn[String(userId)] = userName;
    const updated = db.update("chat_rooms", req.params.id, {
      members: JSON.stringify(updatedMembers),
      participant_names: JSON.stringify(pn),
    });
    res.json({ success: true, data: { ...updated, members: updatedMembers } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/rooms/:id", (req, res) => {
  try {
    const { members, ...rest } = req.body;
    const updates = { ...rest };
    if (members !== undefined)
      updates.members = JSON.stringify(Array.isArray(members) ? members : []);
    const updated = db.update("chat_rooms", req.params.id, updates);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/rooms/:id", (req, res) => {
  try {
    db.delete("chat_rooms", req.params.id);
    db.getCollection("chat_messages")
      .filter((m) => m.room_id === req.params.id)
      .forEach((m) => db.delete("chat_messages", m.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Mark all messages in a room as read (bulk) ────────────────────────────
router.post("/rooms/:roomId/read", (req, res) => {
  try {
    const { userName } = req.body;
    if (!userName) return res.status(400).json({ success: false, error: "userName required" });
    const msgs = db.getCollection("chat_messages").filter((m) => m.room_id === req.params.roomId);
    let count = 0;
    for (const m of msgs) {
      const rb = typeof m.read_by === "string" ? JSON.parse(m.read_by || "[]") : m.read_by || [];
      if (!rb.includes(userName)) {
        rb.push(userName);
        db.update("chat_messages", m.id, { read_by: JSON.stringify(rb) });
        count++;
      }
    }
    res.json({ success: true, data: { marked: count } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Messages ───────────────────────────────────────────────────────────────
router.get("/rooms/:roomId/messages", (req, res) => {
  try {
    const { limit = 50, before } = req.query;
    let msgs = db.getCollection("chat_messages").filter((m) => m.room_id === req.params.roomId);
    if (before) msgs = msgs.filter((m) => new Date(m.created_at) < new Date(before));
    msgs = msgs
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(-Number(limit));
    msgs = msgs.map((m) => ({
      ...m,
      attachments:
        typeof m.attachments === "string" ? JSON.parse(m.attachments || "[]") : m.attachments || [],
      read_by: typeof m.read_by === "string" ? JSON.parse(m.read_by || "[]") : m.read_by || [],
    }));
    res.json({ success: true, data: msgs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/rooms/:roomId/messages", (req, res) => {
  try {
    // Accept sender_name (frontend) or sender (legacy)
    const sender_name = req.body.sender_name || req.body.sender || "";
    const { text = "", attachments = [], reply_to = null } = req.body;
    if (!sender_name) return res.status(400).json({ success: false, error: "Sender required" });
    if (!text && (!attachments || attachments.length === 0))
      return res.status(400).json({ success: false, error: "Message or attachment required" });
    const msg = db.insert("chat_messages", {
      room_id: req.params.roomId,
      sender_name,
      text,
      attachments: JSON.stringify(Array.isArray(attachments) ? attachments : []),
      reply_to,
      read_by: JSON.stringify([sender_name]),
      edited: false,
    });
    db.insert("notifications", {
      type: "chat_message",
      message: `New message from ${sender_name}`,
      entity_type: "chat",
      entity_id: req.params.roomId,
      user: "all",
      read: false,
    });
    res.status(201).json({
      success: true,
      data: {
        ...msg,
        attachments: Array.isArray(attachments) ? attachments : [],
        read_by: [sender_name],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/messages/:id", (req, res) => {
  try {
    const updated = db.update("chat_messages", req.params.id, {
      text: req.body.text,
      edited: true,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/messages/:id/read", (req, res) => {
  try {
    const msg = db.getById("chat_messages", req.params.id);
    if (!msg) return res.status(404).json({ success: false, error: "Not found" });
    const readBy =
      typeof msg.read_by === "string" ? JSON.parse(msg.read_by || "[]") : msg.read_by || [];
    const { user } = req.body;
    if (user && !readBy.includes(user)) readBy.push(user);
    const updated = db.update("chat_messages", req.params.id, { read_by: JSON.stringify(readBy) });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/messages/:id", (req, res) => {
  try {
    db.delete("chat_messages", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
