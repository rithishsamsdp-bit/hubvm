import React, { useState, useEffect } from "react";
import { callStore } from "../store/useCallStore";
import Icon from "../constants/Icon";
import "./styles/WaitingCallPopup.css";

const WaitingCallPopup = () => {
    const { waitingCall, acceptWaitingCall, rejectWaitingCall } = callStore();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (waitingCall) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [waitingCall]);

    if (!isVisible || !waitingCall) return null;

    const displayName = waitingCall.callerName && waitingCall.callerName !== "Unknown"
        ? waitingCall.callerName
        : "Unknown User";

    const handleAnswer = async () => {
        await acceptWaitingCall();
    };

    const handleReject = async () => {
        await rejectWaitingCall();
    };

    return (
        <div className="waiting-call-popup">
            <div className="waiting-call-header">
                <Icon name="phone_callback" size={16} color="#ff9f0a" />
                <span>Waiting Call</span>
            </div>

            <div className="waiting-call-info">
                <div className="waiting-caller-name">{displayName}</div>
                <div className="waiting-caller-number">{waitingCall.dialnumber}</div>
            </div>

            <div className="waiting-call-actions">
                <button className="waiting-btn btn-answer" onClick={handleAnswer}>
                    <Icon name="call" size={18} color="#fff" />
                    Answer
                </button>
                <button className="waiting-btn btn-hangup" onClick={handleReject}>
                    <Icon name="callend" size={18} color="#fff" />
                    Reject
                </button>
            </div>
        </div>
    );
};

export default WaitingCallPopup;
