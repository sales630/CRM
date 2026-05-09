/* eslint-disable */
/**
 * CallContext — WebRTC video/audio calling via HTTP polling.
 * Uses the existing /api/notifications endpoint for signaling.
 * No WebSocket or server restart required.
 */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { notificationsAPI } from "services/api";

const CallContext = createContext(null);

const ICE_SERVERS = {
  iceCandidatePoolSize: 10, iceTransportPolicy: "all", bundlePolicy: "max-bundle", iceServers: [
    
    
    { urls: "stun:stun2.l.google.com:19302" },
    // Free TURN relay — allows calls across different networks (home ↔ office)
    {
      urls: ["turn:a.relay.metered.ca:80","turn:a.relay.metered.ca:80?transport=tcp","turn:a.relay.metered.ca:443","turns:a.relay.metered.ca:443?transport=tcp"] /* openrelayproject TURN was shut down in 2025 — sign up at https://www.metered.ca for free TURN and put real turn URL here */,
      username:   "06cb337f598fdcfaaa37f3b1",
      credential: "zcAopN9nx6/2DSsQ",
    },
  ],
};

const HEARTBEAT_INTERVAL = 8000;   // ms — how often to broadcast presence
const POLL_INTERVAL      = 1000;   // ms — how often to check for signals
const ONLINE_TIMEOUT     = 20000;  // ms — consider user offline after this

// ── Signal helpers ────────────────────────────────────────────────────────────
const sendSignalHTTP = async (toUserId, fromUserId, fromName, type, payload) => {
  try {
    await notificationsAPI.create({
      type: "call_signal",
      user: String(toUserId),
      message: JSON.stringify({ signalType: type, from: String(fromUserId), fromName, payload }),
      entity_type: "call",
      entity_id:   String(fromUserId),
    });
  } catch (e) {
    console.error("[Call] Failed to send signal:", type, e.message);
  }
};

export function CallProvider({ children }) {
  const { currentUser } = useAuth();

  // ── Stable refs ───────────────────────────────────────────────────────────
  const pcRef             = useRef(null);
  const localStreamRef    = useRef(null);
  const screenStreamRef   = useRef(null);
  const pendingCandidates = useRef([]);
  const timerRef          = useRef(null);
  const heartbeatRef      = useRef(null);
  const pollRef           = useRef(null);
  const callStateRef      = useRef("idle");
  const remoteUserRef     = useRef(null);
  const incomingCallRef   = useRef(null);
  const currentUserRef    = useRef(null);
  const processedSigs     = useRef(new Set()); // avoid re-processing same signal

  // ── UI state ─────────────────────────────────────────────────────────────
  const [connected,        setConnected]        = useState(false);
  const [onlineUsers,      setOnlineUsers]       = useState([]);
  const [callState,        setCallState]         = useState("idle");
  const [callType,         setCallType]          = useState("video");
  const [remoteUser,       setRemoteUser]        = useState(null);
  const [localStream,      setLocalStream]       = useState(null);
  const [remoteStream,     setRemoteStream]      = useState(null);
  const [isMuted,          setIsMuted]           = useState(false);
  const [isCamOff,         setIsCamOff]          = useState(false);
  const [isSharingScreen,  setIsSharingScreen]   = useState(false);
  const [incomingCall,     setIncomingCall]      = useState(null);
  const [callDuration,     setCallDuration]      = useState(0);

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const setCS = (s) => { callStateRef.current = s; setCallState(s); };

  const signal = (toUserId, type, payload) =>
    sendSignalHTTP(toUserId, currentUserRef.current?.id, currentUserRef.current?.name, type, payload);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const doCleanup = useCallback(() => {
    clearInterval(timerRef.current); timerRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current  = null;
    screenStreamRef.current = null;
    if (pcRef.current) { try { pcRef.current.close(); } catch {} pcRef.current = null; }
    pendingCandidates.current = [];
    remoteUserRef.current   = null;
    incomingCallRef.current = null;
    callStateRef.current    = "idle";
    setLocalStream(null); setRemoteStream(null); setRemoteUser(null);
    setCallDuration(0); setIsMuted(false); setIsCamOff(false);
    setIsSharingScreen(false); setIncomingCall(null); setCallState("idle");
  }, []);

  const startTimer = () => {
    if (timerRef.current) return;
    setCallDuration(0);
    timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  };

  // ── Get media ─────────────────────────────────────────────────────────────
  const getMedia = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000 },
        video: type !== "audio" ? { width: { ideal: 640, max: 1280 }, height: { ideal: 480, max: 720 }, frameRate: { ideal: 24, max: 30 } } : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000 }, video: false });
        localStreamRef.current = stream;
        setLocalStream(stream);
        return stream;
      } catch (e) {
        alert("Cannot access camera/microphone. Please allow browser permissions and try again.");
        return null;
      }
    }
  };

  // ── Create PeerConnection ─────────────────────────────────────────────────
  const createPC = (targetUserId) => {
    if (pcRef.current) { try { pcRef.current.close(); } catch {} }
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc._remoteStream = new MediaStream(); // accumulates all incoming tracks
    pcRef.current = pc;

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) signal(targetUserId, "ice-candidate", candidate.toJSON());
    };

    pc.ontrack = (e) => {
      // Some browsers fire ontrack with e.streams empty — always add track to our own stream
      let stream;
      if (e.streams && e.streams.length > 0) {
        // Use the stream provided by the browser (preferred)
        stream = e.streams[0];
        // Also mirror into _remoteStream in case we switch references later
        e.streams[0].getTracks().forEach(t => {
          if (!pc._remoteStream.getTracks().find(x => x.id === t.id)) {
            pc._remoteStream.addTrack(t);
          }
        });
      } else if (e.track) {
        // Build stream manually — add track if not already present
        if (!pc._remoteStream.getTracks().find(x => x.id === e.track.id)) {
          pc._remoteStream.addTrack(e.track);
        }
        stream = pc._remoteStream;
      }
      if (stream) {
        setRemoteStream(stream);
        if (callStateRef.current !== "active") { setCS("active"); startTimer(); }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected")  { setCS("active"); startTimer(); }
      console.log("[Conn]", pc.connectionState); if (pc.connectionState === "closed") doCleanup();
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setCS("active"); startTimer();
      }
      console.log("[ICE]", pc.iceConnectionState); if (pc.iceConnectionState === "failed") { console.warn("[ICE] failed - attempting restart"); try { pc.restartIce && pc.restartIce(); } catch(e){} }
    };

    return pc;
  };

  const flushCandidates = async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    const q = [...pendingCandidates.current]; pendingCandidates.current = [];
    for (const c of q) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
  };

  // ── Process one incoming signal ───────────────────────────────────────────
  const processSignal = async (notif) => {
    if (processedSigs.current.has(notif.id)) return;
    processedSigs.current.add(notif.id);

    // Mark read immediately so we don't process twice
    try { await notificationsAPI.markRead(notif.id); } catch {}

    let msg;
    try { msg = JSON.parse(notif.message); } catch { return; }
    const { signalType, from, fromName, payload } = msg;
    console.log("[Signal] ←", signalType, "from", fromName);

    switch (signalType) {
      case "call-offer":
        if (callStateRef.current !== "idle") {
          await signal(from, "call-busy", {});
          return;
        }
        const ic = { from, fromName, offer: payload.offer, callType: payload.callType || "video" };
        incomingCallRef.current = ic;
        setIncomingCall(ic);
        setCS("incoming");
        break;

      case "call-answer":
        if (!pcRef.current) return;
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
          await flushCandidates();
        } catch (e) { console.error("[Call] setRemoteDescription:", e); }
        break;

      case "ice-candidate":
        if (!pcRef.current) return;
        if (pcRef.current.remoteDescription) {
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(payload)); } catch {}
        } else {
          pendingCandidates.current.push(payload);
        }
        break;

      case "call-rejected":
        doCleanup();
        break;

      case "call-ended":
        doCleanup();
        break;

      case "call-busy":
        doCleanup();
        setTimeout(() => alert(`${remoteUserRef.current?.userName || "User"} is busy.`), 50);
        break;
    }
  };

  // ── Heartbeat + polling loop ──────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;

    const myId   = String(currentUser.id);
    const myName = currentUser.name;

    // Send heartbeat to announce presence
    const sendHeartbeat = async () => {
      try {
        await notificationsAPI.create({
          type:        "heartbeat",
          user:        "all",
          message:     JSON.stringify({ userId: myId, userName: myName, ts: Date.now() }),
          entity_type: "presence",
          entity_id:   myId,
        });
        setConnected(true);
      } catch { setConnected(false); }
    };

    // Poll for pending call signals addressed to me
    const poll = async () => {
      try {
        // 1. Get my pending call signals
        const sigs = await notificationsAPI.getAll({ type: "call_signal", read: "false", limit: 20 });
        for (const s of (sigs || [])) await processSignal(s);

        // 2. Update online users from heartbeats (server now returns all, 1 per user)
        const beats = await notificationsAPI.getAll({ type: "heartbeat", limit: 500 });
        const cutoff = Date.now() - ONLINE_TIMEOUT;
        const seen = new Map();
        for (const b of (beats || [])) {
          try {
            const d = JSON.parse(b.message);
            // Accept heartbeat if: message ts is recent OR the record was updated recently
            const recordTs = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            const msgTs    = d.ts || 0;
            const lastSeen = Math.max(recordTs, msgTs);
            if (lastSeen > cutoff && d.userId !== myId) {
              seen.set(d.userId, { userId: d.userId, userName: d.userName });
            }
          } catch {}
        }
        setOnlineUsers(Array.from(seen.values()));
        setConnected(true);

        // 3. Trim processedSigs to prevent memory leak (keep last 200)
        if (processedSigs.current.size > 200) {
          const arr = Array.from(processedSigs.current);
          processedSigs.current = new Set(arr.slice(arr.length - 200));
        }
      } catch { setConnected(false); }
    };

    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      clearInterval(heartbeatRef.current);
      clearInterval(pollRef.current);
    };
  }, [currentUser?.id]);

  // ── Start outgoing call ───────────────────────────────────────────────────
  const startCall = useCallback(async (targetUser, type = "video") => {
    if (callStateRef.current !== "idle") return;
    console.log("[Call] Calling", targetUser.userName, type);

    remoteUserRef.current = targetUser;
    setRemoteUser(targetUser);
    setCallType(type);
    setCS("calling");

    const stream = await getMedia(type);
    if (!stream) { doCleanup(); return; }

    const pc = createPC(String(targetUser.userId));
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await signal(targetUser.userId, "call-offer", {
        offer:    { type: offer.type, sdp: offer.sdp },
        callType: type,
      });
    } catch (e) {
      console.error("[Call] createOffer:", e);
      doCleanup();
    }
  }, [doCleanup]);

  // ── Accept call ───────────────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    const ic = incomingCallRef.current;
    if (!ic) return;
    const { from, fromName, offer, callType: cType } = ic;
    incomingCallRef.current = null;
    setIncomingCall(null);

    const ru = { userId: from, userName: fromName };
    remoteUserRef.current = ru;
    setRemoteUser(ru);
    setCallType(cType || "video");
    setCS("connecting"); // will become "active" once ontrack / ICE fires

    const stream = await getMedia(cType || "video");
    if (!stream) { doCleanup(); return; }

    const pc = createPC(from);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await flushCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await signal(from, "call-answer", { answer: { type: answer.type, sdp: answer.sdp } });
      startTimer();
    } catch (e) {
      console.error("[Call] createAnswer:", e);
      doCleanup();
    }
  }, [doCleanup]);

  // ── Reject / End ──────────────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    const ic = incomingCallRef.current;
    if (ic) signal(ic.from, "call-rejected", {});
    incomingCallRef.current = null;
    setIncomingCall(null);
    setCS("idle");
  }, []);

  const endCall = useCallback(() => {
    const ru = remoteUserRef.current;
    if (ru) signal(ru.userId, "call-ended", {});
    doCleanup();
  }, [doCleanup]);

  // ── Mute / Camera / Screen ────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  }, []);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCamOff(c => !c);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      const cam = localStreamRef.current?.getVideoTracks()[0];
      const sender = pc.getSenders().find(s => s.track?.kind === "video");
      if (sender && cam) await sender.replaceTrack(cam);
      setIsSharingScreen(false);
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = screen;
        const track = screen.getVideoTracks()[0];
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(track);
        track.onended = () => { screenStreamRef.current = null; setIsSharingScreen(false); };
        setIsSharingScreen(true);
      } catch {}
    }
  }, []);

  const isOnline = useCallback((userId) =>
    onlineUsers.some(u => String(u.userId) === String(userId)), [onlineUsers]);

  const fmtDuration = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`
      : `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  return (
    <CallContext.Provider value={{
      connected, onlineUsers, isOnline,
      callState, callType, remoteUser,
      localStream, remoteStream,
      isMuted, isCamOff, isSharingScreen,
      incomingCall, callDuration, fmtDuration,
      startCall, acceptCall, rejectCall, endCall,
      toggleMute, toggleCamera, toggleScreenShare,
    }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) return {
    connected: false, onlineUsers: [], isOnline: () => false,
    callState: "idle", callType: "video", remoteUser: null,
    localStream: null, remoteStream: null,
    isMuted: false, isCamOff: false, isSharingScreen: false,
    incomingCall: null, callDuration: 0, fmtDuration: () => "00:00",
    startCall: () => {}, acceptCall: () => {}, rejectCall: () => {},
    endCall: () => {}, toggleMute: () => {}, toggleCamera: () => {},
    toggleScreenShare: () => {},
  };
  return ctx;
}
