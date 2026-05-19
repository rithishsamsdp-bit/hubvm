import { useState, useEffect } from "react";
import "./styles/IncomingCall.css";
import Icon from "../constants/Icon.jsx";
import { callStore } from "../store/useCallStore";
import { SessionState } from "sip.js"; 
import { useNavigate } from "react-router-dom";
import conversationaxios from "../services/conversationaxios.js";

const IncomingCall = () => {
  const { 
    session, 
    callstatus, 
    hangUp, 
    initUA, 
    callerName, 
    callerNumber, 
    IncomingcallBar,
    activeCalls,
    holdAllOtherCalls,
    incomingCallId 
  } = callStore();
  const navigate = useNavigate();
  const [contactName, setContactName] = useState("");
  const [isLoadingContact, setIsLoadingContact] = useState(false);

  // Fetch contact details when caller number changes
  useEffect(() => {
    const fetchContactDetails = async () => {
      if (!callerNumber) return;

      setIsLoadingContact(true);
      try {

        console.log("payload for contact fetch:", {
          phonenumber: callerNumber
        });
        const response = await conversationaxios.post("/agent/get/contact", {
          phonenumber: callerNumber
        });

        console.log("Contact fetch response:", response);

        if (response.data && response.data.data && response.data.data.length > 0) {
          const contact = response.data.data[0];
          setContactName(contact.c_Name || callerName);
        } else {
          setContactName(callerName);
        }
      } catch (error) {
        console.error("Error fetching contact:", error);
        setContactName(callerName);
      } finally {
        setIsLoadingContact(false);
      }
    };

    fetchContactDetails();
  }, [callerNumber, callerName]);

  useEffect(() => {
    if (!session) {
      initUA(); 
      return;
    }

    return () => {
      if (session.state === SessionState.Terminated) {
        hangUp();
      }
    };
  }, [session, initUA, hangUp]);

  const handleAccept = async () => {
    if (session) {
      try {
        if (activeCalls.length > 1) {
          await holdAllOtherCalls(incomingCallId);
        }

        await session.accept({
          sessionDescriptionHandlerOptions: {
            constraints: { audio: true, video: false },
          },
        });

        callStore.setState({ callstatus: "Answered" });
        navigate("/agent-conversation");
      } catch (error) {
        console.error("Accept failed:", error);
      }
    }
  };

  const handleDecline = () => {
    if (session) {
      hangUp();
    }
  };
  
  if (IncomingcallBar) {
    const getAvatarText = (name, number) => {
      if (name && name.trim()) {
        return name.slice(0, 2).toUpperCase();
      }
      if (number) {
        return number.replace(/^\+91\s*/, "").slice(0, 2); 
      }
      return "UN";
    };

    const displayName = contactName || callerName;

    return (
      <div className={`call-container-layout ${IncomingcallBar ? "active" : ""}`}>
        <div className="call-container">
          <div className="incoming_avatar">
            {getAvatarText(displayName, callerNumber)}
          </div>
          <div className="call-info">
            <h2>{isLoadingContact ? "Loading..." : displayName}</h2>
            <p>{callerNumber}</p>
          </div>
          <div className="call-buttons">
            <button className="accept" onClick={handleAccept}>
              <Icon name="call" color="#ffff" size={24}/>
            </button>
            <button className="decline" onClick={handleDecline}>
              <Icon name="callend" color="#ffff" size={28}/>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default IncomingCall;