/* eslint-disable */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { notificationsAPI } from "services/api";

const CallContext = createContext(null);

const POLL_INTERVAL = 1000;
const HEARTBEAT_INTERVAL = 8000;
const ONLINE_TIMEOUT = 20000;

const sendSig = async (toUserId, fromUserId, fromName, type, payload) => {
    try {
          await notificationsAPI.create({
                  type: "call_signal",
                  user: String(toUserId),
                  message: JSON.stringify({ signalType: type, from: String(fromUserId), fromName, payload: payload || {} }),
                  entity_type: "call",
                  entity_id: String(fromUserId),
          });
    } catch (e) { console.error("[Call] signal failed:", type, e.message); }
};

export function CallProvider({ children }) {
    const { currentUser } = useAuth();
    const myId = currentUser && currentUser.id ? String(currentUser.id) : null;
    const myName = (currentUser && currentUser.name) || "User";

  const [callState, setCS] = useState("idle");
    const [callType, setCallType] = useState("video");
    const [remoteUser, setRemoteUser] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [jitsiRoom, setJitsiRoom] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);

  const callStateRef = useRef("idle");
    const remoteUserRef = useRef(null);
    const incomingCallRef = useRef(null);
    const onlineMapRef = useRef(new Map());

  useEffect(() => { callStateRef.current = callState; }, [callState]);

  const cleanup = useCallback(() => {
        setCS("idle");
        setJitsiRoom(null);
        setRemoteUser(null);
        setIncomingCall(null);
        setCallType("video");
        remoteUserRef.current = null;
        incomingCallRef.current = null;
  }, []);

  const startCall = useCallback(async (target, type, targetUserName) => { let targetUserId = target; if (target && typeof target === "object") { targetUserId = target.userId; targetUserName = target.userName; }
        if (!myId) return;
        if (callStateRef.current !== "idle") return;
        const t = (typeof type === "string") ? type : "video";
        const room = "crm-" + myId + "-" + targetUserId + "-" + Date.now().toString(36);
        const ru = { userId: String(targetUserId), userName: targetUserName || ("User " + targetUserId) };
        setCallType(t);
        setRemoteUser(ru);
        setJitsiRoom(room);
        setCS("active");
        remoteUserRef.current = ru;
        await sendSig(targetUserId, myId, myName, "call-offer", { jitsiRoom: room, callType: t });
  }, [myId, myName]);

  const acceptCall = useCallback(async () => {
        const ic = incomingCallRef.current;
        if (!ic) return;
        setIncomingCall(null);
        incomingCallRef.current = null;
        setCallType(ic.callType || "video");
        const ru = { userId: String(ic.from), userName: ic.fromName };
        setRemoteUser(ru);
        setJitsiRoom(ic.jitsiRoom);
        setCS("active");
        remoteUserRef.current = ru;
        await sendSig(ic.from, myId, myName, "call-answer", { accepted: true });
  }, [myId, myName]);

  const rejectCall = useCallback(async () => {
        const ic = incomingCallRef.current;
        if (ic) await sendSig(ic.from, myId, myName, "call-rejected", {});
        setIncomingCall(null);
        incomingCallRef.current = null;
        setCS("idle");
  }, [myId, myName]);

  const endCall = useCallback(async () => {
        const ru = remoteUserRef.current;
        if (ru) await sendSig(ru.userId, myId, myName, "call-ended", {});
        cleanup();
  }, [myId, myName, cleanup]);

  const noop = useCallback(() => {}, []); const isOnline = useCallback((uid) => { if (!uid) return false; const u = onlineMapRef.current.get(String(uid)); return !!(u && (Date.now() - u.lastSeen) < ONLINE_TIMEOUT); }, []);

  useEffect(() => {
        if (!myId) return;
        let cancelled = false;

                const sendHeartbeat = async () => {
                        try {
                                  await notificationsAPI.create({
                                              type: "call_signal",
                                              user: myId,
                                              message: JSON.stringify({ signalType: "heartbeat", from: myId, fromName: myName, payload: { userId: myId, userName: myName } }),
                                              entity_type: "presence",
                                              entity_id: myId,
                                  });
                        } catch (e) {}
                };

                const handle = async (notif) => {
                        try { await notificationsAPI.markRead(notif.id); } catch (e) {}
                        let msg;
                        try { msg = JSON.parse(notif.message); } catch (e) { return; }
                        const signalType = msg.signalType, from = msg.from, fromName = msg.fromName, payload = msg.payload || {};
                        if (signalType !== "heartbeat") console.log("[Signal]", signalType, "from", fromName);
                        if (signalType === "call-offer") {
                                  if (callStateRef.current !== "idle") {
                                              await sendSig(from, myId, myName, "call-busy", {});
                                              return;
                                  }
                                  const ic = { from: String(from), fromName: fromName, jitsiRoom: payload.jitsiRoom, callType: payload.callType || "video" };
                                  incomingCallRef.current = ic;
                                  setIncomingCall(ic);
                                  setCS("incoming");
                        } else if (signalType === "call-rejected" || signalType === "call-ended") {
                                  cleanup();
                        } else if (signalType === "call-busy") {
                                  cleanup();
                                  setTimeout(() => alert(((remoteUserRef.current && remoteUserRef.current.userName) || "User") + " is busy."), 50);
                        } else if (signalType === "heartbeat") {
                                  if (payload.userId && String(payload.userId) !== myId) {
                                              onlineMapRef.current.set(String(payload.userId), { userId: String(payload.userId), userName: payload.userName, lastSeen: Date.now() });
                                  }
                        }
                };

                const pollOnce = async () => {
                        try {
                                  const notifs = await notificationsAPI.getAll();
                                  const calls = (notifs || []).filter(n => n.type === "call_signal" && !n.read);
                                  for (const n of calls) {
                                              if (cancelled) break;
                                              await handle(n);
                                  }
                                  const now = Date.now();
                                  const list = [];
                                  onlineMapRef.current.forEach((u, id) => {
                                              if (now - u.lastSeen < ONLINE_TIMEOUT) list.push(u);
                                              else onlineMapRef.current.delete(id);
                                  });
                                  setOnlineUsers(list);
                        } catch (e) {}
                };

                const hb = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        const pl = setInterval(pollOnce, POLL_INTERVAL);
        sendHeartbeat();
        pollOnce();
        return () => { cancelled = true; clearInterval(hb); clearInterval(pl); };
  }, [myId, myName, cleanup]);

  return (
        <CallContext.Provider value={{
          callState: callState,
          callType: callType,
          remoteUser: remoteUser,
          incomingCall: incomingCall,
          jitsiRoom: jitsiRoom,
          onlineUsers: onlineUsers,
          localStream: null,
          remoteStream: null,
          isMuted: false,
          isCamOff: false,
          isSharingScreen: false,
          startCall: startCall,
          acceptCall: acceptCall,
          rejectCall: rejectCall,
          endCall: endCall,
          toggleMute: noop,
          toggleCam: noop,
          toggleScreen: noop, isOnline: isOnline, connected: true,
  }}>
{children}
</CallContext.Provider>
  );
}

export function useCall() { return useContext(CallContext); }
