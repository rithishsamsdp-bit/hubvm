import React, { useMemo } from "react";
import Sidebar from "./Sidebar";
import CallingBar from "./CallingBar";
import IncomingCall from "./IncomingCall";
import WaitingCallCard from "./WaitingCallCard";
import { callStore } from "../store/useCallStore";

const Layout = ({ children }) => {
  const { activeCalls, IncomingcallBar, isConferenceActive, conferenceParticipants } = callStore();

  const getBottomPadding = useMemo(() => {
    // No active calls
    if (!activeCalls || activeCalls.length === 0) return "0px";

    const numberOfCalls = activeCalls.length;
    const baseHeight = 50; // height of one call bar
    const stackOffset = 30; // space for each stacked call

    // 🔹 If only conference active
    if (isConferenceActive && (!activeCalls || numberOfCalls === 0)) {
      console.log('If only conference active')
      return "75px";
    }

    // 🔹 If conference + normal calls both active
    if (isConferenceActive && numberOfCalls != conferenceParticipants?.length) {
      // Example: conference occupies one bar + rest of normal calls stack
      const totalHeight = baseHeight + ((numberOfCalls - 1) * stackOffset);
      console.log('If conference + normal calls both active');
      return `${totalHeight}px`;
    }

    // 🔹 If only conference call with participants
    if (isConferenceActive && conferenceParticipants?.length > 0) {
      console.log('If only conference call with participants');
      if (conferenceParticipants.length === numberOfCalls) {
        return "67px";
      }
      return "100px";
    }

    // 🔹 If only normal active calls
    if (numberOfCalls === 1) {
      console.log('If only normal active calls');
      return `${baseHeight + 15}px`;
    }

    const cappedCalls = numberOfCalls > 2 ? 1 : numberOfCalls;
    const totalHeight = baseHeight + (cappedCalls - 1) * stackOffset + 22;
    console.log('If only normal active calls with stacking');
    return `${totalHeight}px`;
  }, [activeCalls, isConferenceActive, conferenceParticipants]);

  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      <audio id="remoteAudio" autoPlay style={{ display: "none" }} />
      <div className="flex w-full">
        <Sidebar />
        <div
          className="flex h-screen w-full flex-col overflow-x-hidden overflow-y-auto relative box-border ml-[72px] transition-all duration-300"
          style={{
            paddingBottom: getBottomPadding,
            transitionProperty: "padding-bottom",
          }}
        >
          {children}
          <WaitingCallCard />
          {IncomingcallBar && <IncomingCall />}
          {activeCalls && activeCalls.length > 0 && <CallingBar />}
        </div>
      </div>
    </div>
  );
};

export default Layout;
