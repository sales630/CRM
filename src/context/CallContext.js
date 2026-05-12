/* eslint-disable */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { notificationsAPI } from "services/api";

const CallContext = createContext(null);

const POLL_INTERVAL = 1000;

const ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "turn:global.relay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:global.relay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:global.relay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
    ];

const sendSig = async (toUserId, fromUserId, fromName, type, payload) => {
      try {
              await notificationsAPI.create({
                        type: "call_signal",
                        user: String(toUserId),
                        message: JSON.stringify({ signalType: type, from: String(fromUserId), fromName, payload: payload || {} }),
                        entity_type: "call",
                        entity_id: String(fromUserId)
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
      const [localStream, setLocalStream] = useState(null);
      const [remoteStream, setRemoteStream] = useState(null);
      const [onlineUsers, setOnlineUsers] = useState([]);

  const pcRef = useRef(null);
      const localStreamRef = useRef(null);
      const callStateRef = useRef("idle");
      const remoteUserRef = useRef(null);
      const incomingCallRef = useRef(null);
      const lastSeenRef = useRef(0);
      const pendingICERef = useRef([]);

  useEffect(() => { callStateRef.current = callState; }, [callState]);

  const cleanup = useCallback(() => {
          try { if (pcRef.current) pcRef.current.close(); } catch (e) {}
          pcRef.current = null;
          try { if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop()); } catch (e) {}
          localStreamRef.current = null;
          setLocalStream(null);
          setRemoteStream(null);
          setCS("idle");
          setRemoteUser(null);
          setIncomingCall(null);
          setCallType("video");
          remoteUserRef.current = null;
          incomingCallRef.current = null;
          pendingICERef.current = [];
  }, []);

  const createPC = useCallback((targetUserId, targetUserName) => {
          const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
          pc.onicecandidate = (e) => { if (e.candidate && myId) sendSig(targetUserId, myId, myName, "ice", { candidate: e.candidate }); };
          pc.ontrack = (e) => { if (e.streams && e.streams[0]) setRemoteStream(e.streams[0]); };
          pc.onconnectionstatechange = () => { console.log("[Call] pc state:", pc.connectionState); };
          return pc;
  }, [myId, myName]);

  const getMedia = useCallback(async (type) => {
          const constraints = {
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                    video: type === "video" ? { width: { ideal: 640 }, height: { ideal: 480 } } : false
          };
          return await navigator.mediaDevices.getUserMedia(constraints);
  }, []);

  const startCall = useCallback(async (target, type, targetUserName) => {
          let targetUserId = target;
          if (target && typeof target === "object") { targetUserId = target.userId; targetUserName = target.userName; }
          if (!myId || !targetUserId) return;
          if (callStateRef.current !== "idle") return;
          const t = typeof type === "string" ? type : "video";
          try {
                    setCS("calling"); setCallType(t);
                    const ru = { userId: String(targetUserId), name: targetUserName || ("User " + targetUserId) };
                    setRemoteUser(ru); remoteUserRef.current = ru;
                    const stream = await getMedia(t);
                    localStreamRef.current = stream; setLocalStream(stream);
                    const pc = createPC(targetUserId, targetUserName);
                    pcRef.current = pc;
                    stream.getTracks().forEach(tr => pc.addTrack(tr, stream));
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    await sendSig(targetUserId, myId, myName, "offer", { sdp: offer, callType: t });
          } catch (e) { console.error("[Call] startCall failed:", e.message); cleanup(); }
  }, [myId, myName, getMedia, createPC, cleanup]);

  const acceptCall = useCallback(async () => {
          const inc = incomingCallRef.current;
          if (!inc) return;
          try {
                    setIncomingCall(null); incomingCallRef.current = null;
                    const ru = { userId: inc.from, name: inc.fromName };
                    setRemoteUser(ru); remoteUserRef.current = ru;
                    setCallType(inc.callType || "video");
                    setCS("connecting");
                    const stream = await getMedia(inc.callType || "video");
                    localStreamRef.current = stream; setLocalStream(stream);
                    const pc = createPC(inc.from, inc.fromName);
                    pcRef.current = pc;
                    stream.getTracks().forEach(tr => pc.addTrack(tr, stream));
                    await pc.setRemoteDescription(new RTCSessionDescription(inc.sdp));
                    for (const c of pendingICERef.current) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {} }
                    pendingICERef.current = [];
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    await sendSig(inc.from, myId, myName, "answer", { sdp: answer });
                    setCS("active");
          } catch (e) { console.error("[Call] acceptCall failed:", e.message); cleanup(); }
  }, [myId, myName, getMedia, createPC, cleanup]);

  const rejectCall = useCallback(async () => {
          const inc = incomingCallRef.current;
          if (inc && myId) await sendSig(inc.from, myId, myName, "reject", {});
          cleanup();
  }, [myId, myName, cleanup]);

  const endCall = useCallback(async () => {
          const ru = remoteUserRef.current;
          if (ru && myId) await sendSig(ru.userId, myId, myName, "end", {});
          cleanup();
  }, [myId, myName, cleanup]);

  const handleSignal = useCallback(async (sig) => {
          const t = sig.signalType;
          if (t === "offer") {
                    if (callStateRef.current !== "idle") { await sendSig(sig.from, myId, myName, "reject", { reason: "busy" }); return; }
                    const inc = { from: sig.from, fromName: sig.fromName || "User", sdp: sig.payload.sdp, callType: sig.payload.callType || "video" };
                    setIncomingCall(inc); incomingCallRef.current = inc; setCallType(inc.callType);
          } else if (t === "answer") {
                    if (pcRef.current) {
                                try {
                                              await pcRef.current.setRemoteDescription(new RTCSessionDescription(sig.payload.sdp));
                                              for (const c of pendingICERef.current) { try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {} }
                                              pendingICERef.current = [];
                                              setCS("active");
                                } catch (e) { console.error("[Call] setRemote failed:", e.message); }
                    }
          } else if (t === "ice") {
                    const c = sig.payload.candidate;
                    if (pcRef.current && pcRef.current.remoteDescription) {
                                try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
                    } else { pendingICERef.current.push(c); }
          } else if (t === "reject" || t === "end") { cleanup(); }
  }, [myId, myName, cleanup]);
} else if (t === "reject" || t === "end") { cleanup(); }
}, [myId, myName, cleanup]);

  useEffect(() => {
          if (!myId) return;
          let cancelled = false;
          lastSeenRef.current = Date.now();
          const tick = async () => {
                    try {
                                const list = await notificationsAPI.list();
                                const arr = Array.isArray(list) ? list : (list && list.data) || [];
                                const sigs = arr.filter(n => n.type === "call_signal" && String(n.user) === myId);
                                for (const n of sigs) {
                                              const ts = new Date(n.created_at || n.createdAt || 0).getTime() || (n.id ? Number(n.id) : 0);
                                              if (ts <= lastSeenRef.current) continue;
                                              lastSeenRef.current = ts;
                                              try {
                                                              const msg = typeof n.message === "string" ? JSON.parse(n.message) : n.message;
                                                              await handleSignal(msg);
                                              } catch (e) {}
                                }
                    } catch (e) {}
                    if (!cancelled) setTimeout(tick, POLL_INTERVAL);
          };
          tick();
          return () => { cancelled = true; };
  }, [myId, handleSignal]);

  const isOnline = useCallback(() => true, []);
  const findOnlineUser = useCallback((nameOrId) => {
          const s = String(nameOrId);
          return onlineUsers.find(u => u.userId === s || u.userName === s);
  }, [onlineUsers]);

  const value = {
          callState, callType, localStream, remoteStream,
          remoteUser, incomingCall, onlineUsers,
          startCall, acceptCall, rejectCall, endCall,
          isOnline, findOnlineUser, connected: true, jitsiRoom: null
  };
  return React.createElement(CallContext.Provider, { value }, children);
}

export function useCall() {
      const ctx = useContext(CallContext);
      if (!ctx) return {};
      return ctx;
}
