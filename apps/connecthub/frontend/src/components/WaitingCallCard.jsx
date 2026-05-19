import React, { useEffect, useState } from "react";
import { callStore } from "../store/useCallStore";
import Icon from "../constants/Icon.jsx";
import "./styles/WaitingCallCard.css";

const WaitingCallCard = () => {
    const { waitingCalls, acceptWaitingCall, rejectWaitingCall } = callStore();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (waitingCalls && waitingCalls.length > 0) {
            setVisible(true);
        } else {
            setVisible(false);
        }
    }, [waitingCalls]);

    if (!waitingCalls || waitingCalls.length === 0 || !visible) return null;

    return (
        <div className="waiting-calls-container">
            {waitingCalls.map((call, index) => {
                const displayName = call.callerName || "Unknown Caller";
                const displayNumber = call.dialnumber || "";

                return (
                    <div key={call.id} className="waiting-call-card">
                        <div className="waiting-call-info">
                            <span className="waiting-call-title">
                                {index === 0 ? "Incoming Call..." : "Waiting Call..."}
                            </span>
                            <span className="waiting-call-name" title={displayName}>
                                {displayName}
                            </span>
                            <span className="waiting-call-number">{displayNumber}</span>
                        </div>
                        <div className="waiting-call-actions">
                            <button
                                className="waiting-btn answer"
                                onClick={() => acceptWaitingCall(call.id)}
                                title="Answer"
                            >
                                <Icon name="call" color="#fff" size={20} />
                            </button>
                            <button
                                className="waiting-btn reject"
                                onClick={() => rejectWaitingCall(call.id)}
                                title="Decline"
                            >
                                <Icon name="callend" color="#fff" size={20} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default WaitingCallCard;
