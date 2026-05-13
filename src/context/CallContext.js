/* eslint-disable */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";

const CallContext = createContext(null);
const POLL_INTERVAL = 1500;
const API_BASE = (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) ? "http://localhost:5000" : "https://crm-ye4r.onrender.com";

async function apiPost(p, b) { const t = localStorage.getItem("crm_token"); const r = await fetch(API_BASE + p, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + t }, body: JSON.stringify(b) }); return r.json(); }
async function apiGet(p) { const t = localStorage.getItem("crm_token"); const r = await fetch(API_BASE + p, { headers: { Authorization: "Bearer " + t } }); return r.json(); }

export function CallProvider({ children }) {
        const { currentUser } = useAuth() || {};
        const myId = currentUser && currentUser.id ? String(currentUser.id) : null;
        const myName = (currentUser && currentUser.name) || "User";
        const [callState, setCallState] = useState("idle");
        const [callType, setCallType] = useState("video");
        const [remoteUser, setRemoteUser] = useState(null);
        const [incomingCall, setIncomingCall] = useState(null);
        const [roomName, setRoomName] = useState(null);
        const [onlineUsers, setOnlineUsers] = useState([]);
        const lastSeenRef = useRef(0);
        const callStateRef = useRef("idle");
        const incomingCallRef = useRef(null);
        const remoteUserRef = useRef(null);
        useEffect(() => { callStateRef.current = callState; }, [callState]);
        useEffect(() => { remoteUserRef.current = remoteUser; }, [remoteUser]);
        useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

  const cleanup = useCallback(() => { setCallState("idle"); setCallType("video"); setRoomName(null); setRemoteUser(null); setIncomingCall(null); }, []);

  useEffect(() => {
            if (!myId) return;
            apiGet("/api/users").then(d => { const a = Array.isArray(d) ? d : (d.data || []); setOnlineUsers(a.map(u => ({ userId: String(u.id || u._id), userName: u.name }))); }).catch(() => {});
  }, [myId]);

  const resolveTarget = useCallback((target, hint) => {
            let tid = target; let tname = hint || "";
            if (target && typeof target === "object") { tid = target.userId; tname = target.userName || hint || ""; }
            const bad = !tid || String(tid) === String(myId) || (typeof tid === "string" && tid.indexOf(" ") > -1);
            if (bad) { try { const inp = document.querySelector('[placeholder*="dm_"]'); if (inp) { const m = inp.placeholder.match(/dm_([^_]+)_([^_\s\.]+)/); if (m) { tid = m[1] === String(myId) ? m[2] : m[1]; } } } catch (e) {} }
            return { tid, tname };
  }, [myId]);

  const startCall = useCallback(async (target, type, hint) => {
            console.log("[Call] startCall", target, type);
            if (!myId) return;
            if (callStateRef.current !== "idle") return;
            const { tid, tname } = resolveTarget(target, hint);
            if (!tid || String(tid) === String(myId)) { console.error("[Call] bad target", tid); return; }
            const t = type === "audio" ? "audio" : "video";
            const room = "crm-" + String(myId).substring(0, 8) + "-" + String(tid).substring(0, 8) + "-" + Date.now().toString(36);
            setCallState("calling"); setCallType(t); setRoomName(room);
            setRemoteUser({ userId: String(tid), name: tname || ("User " + tid) });
            try {
                        await apiPost("/api/notifications", { type: "call_signal", user: String(tid), message: JSON.stringify({ signalType: "invite", from: String(myId), fromName: myName, room: room, callType: t }), entity_type: "call", entity_id: String(myId) });
                        console.log("[Call] invite sent");
                        setCallState("active");
            } catch (e) { console.error("[Call] failed:", e.message); cleanup(); }
  }, [myId, myName, resolveTarget, cleanup]);

  const acceptCall = useCallback(async () => {
            const inc = incomingCallRef.current; if (!inc) return;
            setIncomingCall(null); setRemoteUser({ userId: inc.from, name: inc.fromName }); setCallType(inc.callType || "video"); setRoomName(inc.room); setCallState("active");
            try { await apiPost("/api/notifications", { type: "call_signal", user: String(inc.from), message: JSON.stringify({ signalType: "accept", from: String(myId), fromName: myName, room: inc.room }), entity_type: "call", entity_id: String(myId) }); } catch (e) {}
  }, [myId, myName]);

  const rejectCall = useCallback(async () => {
            const inc = incomingCallRef.current;
            if (inc) { try { await apiPost("/api/notifications", { type: "call_signal", user: String(inc.from), message: JSON.stringify({ signalType: "reject", from: String(myId), fromName: myName, room: inc.room }), entity_type: "call", entity_id: String(myId) }); } catch (e) {} }
            cleanup();
  }, [myId, myName, cleanup]);

  const endCall = useCallback(async () => {
            const ru = remoteUserRef.current;
            if (ru && ru.userId && myId) { try { await apiPost("/api/notifications", { type: "call_signal", user: String(ru.userId), message: JSON.stringify({ signalType: "end", from: String(myId), fromName: myName }), entity_type: "call", entity_id: String(myId) }); } catch (e) {} }
            cleanup();
  }, [myId, myName, cleanup]);

  const handleSignal = useCallback((sig) => {
            if (sig.signalType === "invite") {
                        if (callStateRef.current !== "idle") return;
                        setIncomingCall({ from: sig.from, fromName: sig.fromName || "User", room: sig.room, callType: sig.callType || "video" });
            } else if (sig.signalType === "reject" || sig.signalType === "end") { cleanup(); }
  }, [cleanup]);

  useEffect(() => {
            if (!myId) return;
            let cancelled = false; lastSeenRef.current = Date.now();
            const tick = async () => {
                        if (cancelled) return;
                        try {
                                      const j = await apiGet("/api/notifications?type=call_signal&limit=20");
                                      const a = Array.isArray(j) ? j : (j.data || []);
                                      const sigs = a.filter(n => n.type === "call_signal" && String(n.user) === myId);
                                      for (const n of sigs) {
                                                      const ts = new Date(n.created_at || n.createdAt || 0).getTime() || 0;
                                                      if (ts <= lastSeenRef.current) continue;
                                                      lastSeenRef.current = ts;
                                                      try { const m = typeof n.message === "string" ? JSON.parse(n.message) : n.message; handleSignal(m); } catch (e) {}
                                      }
                        } catch (e) {}
                        if (!cancelled) setTimeout(tick, POLL_INTERVAL);
            };
            tick();
            return () => { cancelled = true; };
  }, [myId, handleSignal]);

  const isOnline = useCallback(() => true, []);
        const findOnlineUser = useCallback((s) => { const ss = String(s); return onlineUsers.find(u => u.userId === ss || u.userName === ss); }, [onlineUsers]);

  const value = { callState, callType, roomName, jitsiRoom: roomName, remoteUser, incomingCall, onlineUsers, connected: true, startCall, acceptCall, rejectCall, endCall, isOnline, findOnlineUser, localStream: null, remoteStream: null };
        return React.createElement(CallContext.Provider, { value }, children);
}

export function useCall() { return useContext(CallContext) || {}; }
