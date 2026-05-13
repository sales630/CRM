/* eslint-disable */
import { useEffect, useRef, useState } from "react";
import { useCall } from "context/CallContext";
import { useAuth } from "context/AuthContext";

export default function CallWindow() {
          const { callState, roomName, remoteUser, callType, endCall } = useCall();
          const { currentUser } = useAuth() || {};
          const containerRef = useRef(null);
          const apiRef = useRef(null);
          const [maximized, setMaximized] = useState(true);

  useEffect(() => {
              if (callState !== "active" || !roomName || !containerRef.current) return;
              const userName = (currentUser && currentUser.name) || "User";
              let cancelled = false;
              const init = async () => {
                            if (!window.JitsiMeetExternalAPI) {
                                            await new Promise((res, rej) => {
                                                              const s = document.createElement("script");
                                                              s.src = "https://meet.jit.si/external_api.js";
                                                              s.onload = res; s.onerror = rej;
                                                              document.head.appendChild(s);
                                            });
                            }
                            if (cancelled || !containerRef.current) return;
                            const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
                                            roomName: roomName, parentNode: containerRef.current,
                                            width: "100%", height: "100%",
                                            userInfo: { displayName: userName },
                                            configOverwrite: { startWithAudioMuted: false, startWithVideoMuted: callType === "audio", prejoinPageEnabled: false, disableDeepLinking: true, disableInviteFunctions: true, enableWelcomePage: false, enableClosePage: false, requireDisplayName: false },
                                            interfaceConfigOverwrite: { TOOLBAR_BUTTONS: ["microphone","camera","desktop","fullscreen","hangup","chat","settings","raisehand","videoquality","tileview"], SHOW_JITSI_WATERMARK: false, SHOW_BRAND_WATERMARK: false, SHOW_POWERED_BY: false }
                            });
                            apiRef.current = api;
                            api.addEventListener("readyToClose", () => { if (!cancelled) endCall(); });
                            api.addEventListener("videoConferenceLeft", () => { if (!cancelled) endCall(); });
              };
              init().catch(e => console.error("[Jitsi]", e && e.message));
              return () => { cancelled = true; try { apiRef.current && apiRef.current.dispose(); } catch (e) {} apiRef.current = null; };
  }, [callState, roomName, callType]);

  if (callState !== "active" && callState !== "calling") return null;
          const title = (remoteUser && remoteUser.name) || "User";
          const winStyle = maximized
            ? { position: "fixed", top: 20, left: 20, right: 20, bottom: 20 }
                      : { position: "fixed", bottom: 20, right: 20, width: 640, height: 480 };

  return (
              <div style={Object.assign({ background: "#1a1a1a", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.8)", overflow: "hidden", zIndex: 99999, display: "flex", flexDirection: "column" }, winStyle)}>
      <div style={{ padding: "10px 16px", background: "#0d0d0d", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>
{callType === "video" ? "Video" : "Audio"} call - {title} - {callState === "calling" ? "Ringing..." : "Connected"}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setMaximized(!maximized)} style={{ background: "#444", border: "none", color: "#fff", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>
{maximized ? "Minimize" : "Maximize"}
</button>
          <button onClick={endCall} style={{ background: "#e53935", border: "none", color: "#fff", padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>End Call</button>
        </div>
        </div>
      <div ref={containerRef} style={{ flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        {callState === "calling" ? ("Calling " + title + "...") : null}
</div>
        </div>
  );
}
