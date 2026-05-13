/* eslint-disable */
import React, { createContext, useContext } from "react";

const CallContext = createContext(null);

const NOOP = () => {};
const NOOP_ASYNC = async () => {};

const stubValue = {
      callState: "idle",
      callType: "video",
      localStream: null,
      remoteStream: null,
      remoteUser: null,
      incomingCall: null,
      onlineUsers: [],
      jitsiRoom: null,
      connected: false,
      startCall: NOOP_ASYNC,
      acceptCall: NOOP_ASYNC,
      rejectCall: NOOP_ASYNC,
      endCall: NOOP_ASYNC,
      isOnline: () => false,
      findOnlineUser: () => null,
};

export function CallProvider({ children }) {
      return React.createElement(CallContext.Provider, { value: stubValue }, children);
}

export function useCall() {
      const ctx = useContext(CallContext);
      return ctx || stubValue;
}
