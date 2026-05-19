import React, { useState, useEffect, useRef } from "react";
import "./styles/Iframe.css";
import { callStore } from "../store/useCallStore";
import { DialpadStore } from "../store/agent/useDialpadStore";
import { useConversationStore } from "../store/agent/useConversationStore";
import { useAuthStore } from "../store/useAuthStore";
import { Button, Input, Loader } from "../components/Index.jsx";
import { useNavigate } from "react-router-dom";
import Icon from "../constants/Icon.jsx";
import CallingIcon from "../constants/CallingBar_Icons.jsx";
import DTMFPad from "../components/DTMFPad.jsx";
import { countries, formatTimer } from "../utils/helpers.js";

const Iframe = ({ onCallInitiated }) => {
  const navigate = useNavigate();
  const { authPlan } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const storedCountry = JSON.parse(localStorage.getItem("selectedCountry"));
  const INDIA = countries.find(c => c.code === "IN") || { code: "IN", dial: "91", name: "India" };
  const defaultCode = authPlan?.menu?.defaultDialCountry;
  const planDefault = defaultCode ? (countries.find(c => c.code === defaultCode) || INDIA) : INDIA;
  // Validate stored country — if it exists and is a valid country, use it; else use plan default
  const validStored = storedCountry && countries.some(c => c.code === storedCountry.code) ? storedCountry : null;
  const [selectedCountry, setSelectedCountry] = useState(validStored || planDefault);
  const [showCampaigns, setShowCampaigns] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showContacts, setShowContacts] = useState(false);
  const [isAgentCall, setIsAgentCall] = useState(false);

  // In-Call State
  const [seconds, setSeconds] = useState(0);
  const [showDtmfDialpad, setShowDtmfDialpad] = useState(false);
  const [dtmfDigits, setDtmfDigits] = useState("");
  const intervalRef = useRef(null);

  const getStoredLastCall = () => {
    try {
      const stored = localStorage.getItem("lastCalledNumber");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("Error reading lastCalledNumber from localStorage:", error);
      return null;
    }
  };
  const storedLastCall = getStoredLastCall();
  const [lastCalledNumber, setLastCalledNumber] = useState(storedLastCall?.number || "");
  const [lastCalledWasAgent, setLastCalledWasAgent] = useState(storedLastCall?.wasAgent || false);

  const dialpadRef = useRef(null);
  const inputRef = useRef(null);

  const {
    makeCall,
    makeWhatsCall,
    initUA,
    registrationStatus,
    activeCalls,
    hangUp,
    mute,
    unmute,
    holdCall,
    unholdCall,
    sendDTMF,
    answerCall
  } = callStore();
  
  const { agentCampaignData, getCampaigns, contactsData, getContacts, getContactLoading } =
    DialpadStore();
  const { selectedCampaign, updateCampaign, fetchFormByCampaign, getAgents, agentsData } =
    useConversationStore();

  const activeCall = activeCalls.find(c =>
    ["In Call", "Answered", "Resumed", "On Hold", "Muted", "On Hold & Muted", "Ringing", "Connecting"].includes(c.callstatus)
  );

  // ✨ NEW: Restore selected campaign from localStorage on mount
  useEffect(() => {
    if (!registrationStatus || registrationStatus === "Unregistered") {
      initUA();
    }
    getCampaigns();

    // Restore campaign from localStorage
    const storedCampaignId = localStorage.getItem("CampaignId");
    const storedCampaignName = localStorage.getItem("CampaignName");
    
    if (storedCampaignId && storedCampaignName) {
      const campaignId = parseInt(storedCampaignId, 10);
      console.log("Restoring campaign from localStorage:", {
        id: campaignId,
        name: storedCampaignName
      });
      
      // Update campaign in store
      updateCampaign(storedCampaignName, campaignId);
      
      // Fetch form if it's not Individual campaign
      if (campaignId !== 0) {
        fetchFormByCampaign(campaignId);
      }
    } else {
      // Set default to Individual if nothing stored
      console.log("No stored campaign, defaulting to Individual");
      updateCampaign("Individual", 0);
      localStorage.setItem("CampaignId", "0");
      localStorage.setItem("CampaignName", "Individual");
    }
  }, [initUA, getCampaigns, registrationStatus]);

  // Timer Logic
   useEffect(() => {
    if (activeCall && ["In Call", "Answered", "Resumed", "On Hold", "Muted", "On Hold & Muted"].includes(activeCall.callstatus)) {
      if (!intervalRef.current) {
        const startTime = activeCall.startTime || Date.now();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setSeconds(elapsed);

        intervalRef.current = setInterval(() => {
          setSeconds((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setSeconds(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeCall?.callstatus, activeCall?.startTime]);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dialpadRef.current && !dialpadRef.current.contains(event.target)) {
        setShowContacts(false);
        setShowDropdown(false);
        setShowCampaigns(false);
      }
    };

    if (showContacts || showDropdown || showCampaigns) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showContacts, showDropdown, showCampaigns]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!showContacts && !showDropdown && !showCampaigns && inputRef.current) {
        if(!activeCall){ // Only focus if not in call (input might not exist)
             inputRef.current.focus();
        }
    }
  }, [showContacts, showDropdown, showCampaigns, activeCall]);

  useEffect(() => {
    if (selectedCountry) {
      localStorage.setItem("selectedCountry", JSON.stringify(selectedCountry));
    }
  }, [selectedCountry]);

  // Reset inputs when call ends
  useEffect(() => {
      if(!activeCall) {
          setShowDtmfDialpad(false);
          // could reset other states if needed
      }
  }, [activeCall]);

  // Click-to-Call Listener (PostMessage)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === "CLICK_TO_CALL") {
        const { number } = event.data;
        console.log("Received CLICK_TO_CALL:", number);

        if (number) {
          // Update UI
          setPhoneNumber(number);
          
          // Trigger Call immediately
          // We assume the number provided includes necessary codes or implies local dialing
          // If you need to prepend country code logic here, simpler to expect full number from CRM
          
          if (!activeCalls.some(c => ["Ringing", "Connecting", "In Call"].includes(c.callstatus))) {
             // Logic similar to handleCall but purely programmatic
             const fullNumber = number; // Assuming full number passed or handled by CRM
             
             // Update last called for redial
             const callData = { number: fullNumber, wasAgent: false };
             localStorage.setItem("lastCalledNumber", JSON.stringify(callData));
             setLastCalledNumber(fullNumber);
             setLastCalledWasAgent(false);
             setIsAgentCall(false); // Defaulting to external call

             // Use current selected campaign
             // Note: selectedCampaign is from store closure
             makeCall(fullNumber, () => {}, selectedCampaign?.value || 0);
             
             if (onCallInitiated) onCallInitiated();
          } else {
              console.warn("Call blocked: Agent is busy");
              // Optional: Post back to CRM that line is busy
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [activeCalls, makeCall, selectedCampaign, onCallInitiated]);

  const isCallDisabled = () => {
    return activeCalls.some(
      (call) =>
        call.callstatus === "Ringing" || call.callstatus === "Connecting"
    );
  };

  const handleCall = () => {
    if (isCallDisabled()) {
      return;
    }

    if (!phoneNumber) {
      alert("Please enter the number");
      return;
    }

    const fullNumber = isAgentCall
      ? phoneNumber
      : `${selectedCountry.dial}${phoneNumber}`;

    console.log("Calling number:", fullNumber, "isAgent:", isAgentCall);

    const callData = {
      number: fullNumber,
      wasAgent: isAgentCall
    };
    localStorage.setItem("lastCalledNumber", JSON.stringify(callData));
    console.log("Saved to localStorage:", callData);

    setLastCalledNumber(fullNumber);
    setLastCalledWasAgent(isAgentCall);

    makeCall(fullNumber, () => {}, selectedCampaign.value);
    setPhoneNumber("");
    setIsAgentCall(false);

    if (onCallInitiated) {
      onCallInitiated();
    }
  };

  const handleWhatsAppCall = () => {
    if (isCallDisabled()) {
      return;
    }

    if (!phoneNumber) {
      alert("Please enter the number");
      return;
    }

    const fullNumber = `${selectedCountry.dial}${phoneNumber}`;

    const callData = {
      number: fullNumber,
      wasAgent: false
    };
    localStorage.setItem("lastCalledNumber", JSON.stringify(callData));

    setLastCalledNumber(fullNumber);
    setLastCalledWasAgent(false);

    makeWhatsCall(fullNumber, () => {}, selectedCampaign.value);
    setPhoneNumber("");
    setIsAgentCall(false);

    if (onCallInitiated) {
      onCallInitiated();
    }
  };

  const handleRedial = () => {
    if (isCallDisabled()) {
      return;
    }

    try {
      const stored = localStorage.getItem("lastCalledNumber");
      if (!stored) {
        alert("No previous call to redial");
        return;
      }

      const callData = JSON.parse(stored);
      const numberToCall = callData.number;

      makeCall(numberToCall, () => {}, selectedCampaign.value);

      if (onCallInitiated) {
        onCallInitiated();
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      alert("Unable to redial. No previous call found.");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleCall();
    }
  };

  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    localStorage.setItem("selectedCountry", JSON.stringify(country));
    setShowDropdown(false);
  };

  const handleSelectContact = (contact) => {
    setPhoneNumber(contact.c_phoneNumber);
    setShowContacts(false);
    setSearchTerm("");
    setIsAgentCall(false);
  };

  const handleSelectAgent = (agent) => {
    setPhoneNumber(`${agent.m_memberExtensionNo}` || "");
    setShowContacts(false);
    setSearchTerm("");
    setIsAgentCall(true);
  };

  // ✨ UPDATED: Save both campaign ID and name to localStorage
  const handleSelectCampaign = (camp) => {
    const campaignName = camp.c_campaignName || "Individual";
    const campaignId = camp.c_campaignId || 0;
    
    console.log("Selecting campaign:", { name: campaignName, id: campaignId });
    
    // Update campaign in store
    updateCampaign(campaignName, campaignId);
    
    // Save to localStorage
    localStorage.setItem("CampaignId", campaignId.toString());
    localStorage.setItem("CampaignName", campaignName);
    
    // Fetch form if not Individual
    if (campaignId !== 0) {
      fetchFormByCampaign(campaignId);
    }
    
    setShowCampaigns(false);
  };

  const toggleCampaigns = () => {
    setShowCampaigns((prev) => {
      if (!prev) {
        setShowDropdown(false);
        setShowContacts(false);
      }
      return !prev;
    });
  };

  const toggleCountries = () => {
    setShowDropdown((prev) => {
      if (!prev) {
        setShowCampaigns(false);
        setShowContacts(false);
      }
      return !prev;
    });
  };

  const toggleContacts = () => {
    setShowContacts((prev) => {
      if (!prev) {
        setShowCampaigns(false);
        setShowDropdown(false);
        getContacts();
        getAgents();
      }
      return !prev;
    });
  };

  const dialButtons = [
    ["1", ""],
    ["2", "ABC"],
    ["3", "DEF"],
    ["4", "GHI"],
    ["5", "JKL"],
    ["6", "MNO"],
    ["7", "PQRS"],
    ["8", "TUV"],
    ["9", "WXYZ"],
    ["*", ""],
    ["0", "+"],
    ["#", ""],
  ];

  const filteredContacts = Array.isArray(contactsData)
    ? contactsData.filter((contact) =>
      contact.c_Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.c_phoneNumber?.includes(searchTerm)
    )
    : [];

  const filteredAgents = Array.isArray(agentsData)
    ? agentsData.filter((agent) =>
      agent.m_memberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.m_memberExtensionNo?.toString().includes(searchTerm)
    )
    : [];

  const callButtonDisabled = isCallDisabled();

  // Check if current campaign is selected
  const isCampaignSelected = (campId) => {
    return selectedCampaign?.value === campId;
  };

  // ----------------------------------------------------------------
  // RENDER: Active Call View
  // ----------------------------------------------------------------
  if (activeCall) {
    console.log("Iframe Active Call Debug:", activeCall);
    return (
      <div className="iframe-dialpad-container iframe-incall-view">
        {activeCall.callstatus === "Ringing" && (activeCall.callType === "Incoming" || activeCall.isIncoming === true) ? (
          /* ----------------------------------------------------------------
             INCOMING CALL UI
             ---------------------------------------------------------------- */
          <div className="iframe-incoming-call-container">
             <div className="iframe-incall-header">
                <div className="iframe-incall-avatar heartbeat-animation">
                  {activeCall.dialnumber?.charAt(0) || activeCall.callerName?.charAt(0) || "U"}
                </div>
                <h2 className="iframe-incall-name">{activeCall.callerName || "Unknown"}</h2>
                <p className="iframe-incall-number">{activeCall.dialnumber}</p>
                <p className="iframe-incall-status">Incoming Call...</p>
            </div>

            <div className="iframe-incoming-actions">
              <button
                className="iframe-action-btn reject-btn"
                onClick={() => hangUp(activeCall.id)}
              >
                <div>
                   <Icon name="callend" size={16} color="#FFFFFF" />
                </div>
                <span>Reject</span>
              </button>
              
              <button 
                className="iframe-action-btn answer-btn"
                onClick={() => answerCall(activeCall.id)}
              >
                <div>
                  <Icon name="call" size={16} color="#FFFFFF" />
                </div>
                <span>Answer</span>
              </button>
            </div>
          </div>
        ) : showDtmfDialpad ? (
             <div className="iframe-incall-dtmf-container">
                   <div className="iframe-dtmf-header">
                       <Button variant="empty" onClick={() => setShowDtmfDialpad(false)} className="iframe-back-btn">
                           <Icon name="clearleftarrow" size={24} color="#333" />
                       </Button>
                       <span className="iframe-dtmf-status">Keypad</span>
                   </div>
                   
                   <div className="iframe-dtmf-input-container" style={{ margin: "0 20px 20px 20px", display: "flex", gap: "10px", height: "40px" }}>
                        <input
                          type="text"
                          value={dtmfDigits}
                          onChange={(e) => {
                              const val = e.target.value;
                              if (/^[0-9*#]*$/.test(val)) {
                                  setDtmfDigits(val);
                              }
                          }}
                          className="iframe-dialpad-input-field"
                          placeholder="Enter digits"
                          style={{ 
                              textAlign: "center", 
                              fontSize: "18px", 
                              flex: 1,
                              border: "1px solid #ccd3da",
                              borderRadius: "8px",
                              outline: "none"
                          }}
                        />
                        <button 
                            className="dtmf-send-button"
                            onClick={async () => {
                                if (!dtmfDigits) return;
                                for (const digit of dtmfDigits) {
                                    await sendDTMF(digit, activeCall.id);
                                    await new Promise((resolve) => setTimeout(resolve, 500));
                                }
                                setDtmfDigits("");
                            }}
                            disabled={!dtmfDigits}
                            style={{
                                backgroundColor: !dtmfDigits ? "#ccc" : "#2fc522",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                padding: "0 20px",
                                fontWeight: 600,
                                cursor: !dtmfDigits ? "not-allowed" : "pointer"
                            }}
                        >
                            Send
                        </button>
                   </div>

                   <div className="iframe-dialpad-grid">
                       {dialButtons.map(([num, letters], i) => (
                           <button
                               key={i}
                               className="iframe-dial-button"
                               onClick={() => setDtmfDigits(prev => prev + num)}
                           >
                               <p>{num}</p>
                               {letters && <p className="iframe-dailpad-number-letters">{letters}</p>}
                           </button>
                       ))}
                   </div>
             </div>
        ) : (
             <>
                <div className="iframe-incall-header">
                    <div className="iframe-incall-avatar">{activeCall.dialnumber?.charAt(0) || activeCall.callerName?.charAt(0) || "U"}</div>
                    <h2 className="iframe-incall-name">{activeCall.callerName || activeCall.dialnumber || "Unknown"}</h2>
                    <p className="iframe-incall-number">{activeCall.dialnumber}</p>
                    <p className="iframe-incall-status">{activeCall.callstatus}</p>
                    <p className="iframe-incall-timer">{formatTimer(seconds)}</p>
                </div>

                <div className="iframe-incall-controls">
                    <button
                      className={`iframe-incall-control-btn ${activeCall.muted ? "active" : ""}`}
                      onClick={() => (activeCall.muted ? unmute(activeCall.id) : mute(activeCall.id))}
                    >
                        <div>
                            <CallingIcon name={activeCall.muted ? "mute":"active_mute"} size={22} />
                        </div>
                        <span>Mute</span>
                    </button>

                    <button
                      className="iframe-incall-control-btn"
                       onClick={() => setShowDtmfDialpad(true)}
                    >
                        <div>
                             <Icon name="dialpad" size={24} color="#333" />
                        </div>
                         <span>Keypad</span>
                    </button>

                    <button
                      className={`iframe-incall-control-btn ${activeCall.hold ? "active" : ""}`}
                       onClick={() => (activeCall.hold ? unholdCall(activeCall.id) : holdCall(activeCall.id))}
                    >
                        <div>
                            <CallingIcon name={activeCall.hold ?   "pause":"active_pause"} size={22} />
                        </div>
                         <span>Hold</span>
                    </button>
                    
                     {/* Add more controls like transfer if needed here */}
                </div>

                <div className="iframe-incall-footer">
                   <button
                        className="iframe-incall-hangup-btn"
                        onClick={() => hangUp(activeCall.id)}
                    >
                        <CallingIcon name="end" size={28} />
                    </button>
                </div>
            </>
        )}
      </div>
    );
  }

  // ----------------------------------------------------------------
  // RENDER: Standard Dialpad View
  // ----------------------------------------------------------------
  return (
    <div className="iframe-dialpad-container" ref={dialpadRef}>
      <div className="iframe-dialpad-header">
        Campaign:
        <div 
          className={`iframe-dialpad-campaign-select ${showCampaigns ? 'active' : ''}`}
          onClick={toggleCampaigns}
        >
          {selectedCampaign?.label || "Select Campaign"}
          <Icon 
            name="chevrondown" 
            size={10} 
            className={`campaign-select-icon ${showCampaigns ? 'open' : ''}`}
            color={showCampaigns ? "#1967D2" : "#636363"}
          />
        </div>
        <Button
          type="button"
          variant="empty"
          onClick={handleRedial}
          className="dialpad-redial-button"
          disabled={!lastCalledNumber || callButtonDisabled}
          style={{
            marginLeft: "auto",
            padding: "4px 8px",
            opacity: !lastCalledNumber || callButtonDisabled ? 0.5 : 1,
            cursor: !lastCalledNumber || callButtonDisabled ? "not-allowed" : "pointer",
          }}
          title={lastCalledNumber ? `Redial: ${lastCalledNumber}` : "No previous call"}
        >
          <Icon name="callredial" size={28} color={!lastCalledNumber || callButtonDisabled ? "#919191" : "#2FC522"} />
        </Button>
      </div>

      {/* Enhanced Campaign Dropdown */}
      {showCampaigns && (
        <div className="iframe-campaign-dropdown">
          <div className="iframe-campaign-dropdown-header">Select Campaign</div>
          
          {/* Individual Option */}
          <div
            key="individual-0"
            className={`iframe-campaign-option ${isCampaignSelected(0) ? 'selected' : ''}`}
            onClick={() =>
              handleSelectCampaign({
                c_campaignName: "Individual",
                c_campaignId: 0,
              })
            }
          >
            <div className="iframe-campaign-option-icon">
              <Icon name="user" size={12} />
            </div>
            <div className="iframe-campaign-option-content">
              <span className="iframe-campaign-option-name">Individual</span>
            </div>
            <span className="iframe-campaign-option-badge individual">Personal</span>
            {isCampaignSelected(0) && (
              <span className="iframe-campaign-option-checkmark">✓</span>
            )}
          </div>

          {/* Campaign List */}
       {Array.isArray(agentCampaignData) && agentCampaignData.length > 0 ? (
  <>
    <div className="campaign-dropdown-divider"></div>

    {agentCampaignData
      .filter(
        (camp) =>
          camp?.c_campaignId &&                 // id null / undefined / empty avoid
          camp?.c_campaignName          // name null / undefined avoid
          // camp.c_campaignName.trim() !== ''     // empty string avoid
      )
      .map((camp, idx) => (
        <div
          key={`${camp.m_memberId}-${idx}`}
          className={`iframe-campaign-option ${
            isCampaignSelected(camp.c_campaignId) ? 'selected' : ''
          }`}
          onClick={() => handleSelectCampaign(camp)}
        >
          <div className="iframe-campaign-option-icon">
            {camp.c_campaignName.charAt(0).toUpperCase()}
          </div>

          <div className="iframe-campaign-option-content">
            <span className="iframe-campaign-option-name">
              {camp.c_campaignName}
            </span>
          </div>

          <span className="iframe-campaign-option-badge active">Active</span>

          {isCampaignSelected(camp.c_campaignId) && (
            <span className="iframe-campaign-option-checkmark">✓</span>
          )}
        </div>
      ))}
  </>
) : (
  <div className="campaign-dropdown-empty">No campaigns available</div>
)}
        </div>
      )}

      <p className="iframe-dialpad-numlabel">Enter Number</p>
      <div className="iframe-dialpad-input-box">
        {isAgentCall ? (
          <div className="iframe-dialpad-country-selector">
            <Icon name='user' color="#636363" size={14} />
          </div>
        ) : (
          <div className="iframe-dialpad-country-selector" onClick={toggleCountries}>
            <Icon
              name={selectedCountry.code.toLowerCase()}
              size={24}
              className="iframe-dialpad-flag-icon"
            />
            <span className="iframe-dialpad-country-name">{selectedCountry.code}</span>
            <span className="iframe-dialpad-country-code">{selectedCountry.dial}</span>
          </div>
        )}

        <Icon name='dialpadinputdivider' color="#002449" size={14} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Enter"
          className="iframe-dialpad-input-field"
          value={phoneNumber}
          maxLength={10}
          inputMode="numeric"
          onChange={(e) => {
            const filtered = e.target.value.replace(/[^0-9*#]/g, "");
            setPhoneNumber(filtered.slice(0, 10));
            setIsAgentCall(false);
          }}
          onKeyPress={handleKeyPress}
        />
        {/* <Button type="button" variant="empty" onClick={toggleContacts} className="dialpad-contact-icon">
          <Icon name='contactbook' size={22} color="#636363" />
        </Button> */}

        {showDropdown && (
          <div className="iframe-country-dropdown">
            <input
              type="text"
              placeholder="Search country"
              className="country-search"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {countries
                .filter((country) => {
                  const search = searchTerm.toLowerCase();
                  const allowedCountries = authPlan?.menu?.dialpadCountries;
                  // If dialpadCountries is not strictly defined or is completely empty, it could mean 'all' or 'none'. 
                  // Because limits usually mean restrictions, if there's a restriction array containing allowed codes, we filter by it.
                  // Default behavior: if no country is configured, maybe show none to force strictness.
                  const isAllowed = Array.isArray(allowedCountries) && allowedCountries.length > 0 
                     ? allowedCountries.includes(country.code)
                     : true; // fallback: show all if not defined, or you could do false
                  
                  return isAllowed && (
                    country.name.toLowerCase().includes(search) ||
                    country.code.toLowerCase().includes(search) ||
                    country.dial.includes(search)
                  );
                })
              .map((country) => (
                <div
                  key={country.code}
                  className="iframe-dialpad-country-option"
                  onClick={() => handleSelectCountry(country)}
                >
                  <Icon
                    name={country.code.toLowerCase()}
                    size={32}
                    className="flag-icon"
                  />
                  <span className="iframe-dial-name">{country.name}</span>
                  <span className="dial-code">{country.dial}</span>
                </div>
              ))}
          </div>
        )}

        {showContacts && (
          <div className="iframe-contacts-panel">
            <div className="iframe-contacts-search-wrapper">
              <Input
                type="text"
                placeholder="Search contacts or agents"
                suffixIcon={<Icon name="search" size={14} color="#9E9E9E" />}
                onChange={(e) => setSearchTerm(e.target.value)}
                value={searchTerm}
              />
            </div>
            {getContactLoading ? (
              <Loader />
            ) : (
              <div className="iframe-contacts-list">
                {/* Contacts Section */}
                {filteredContacts.length > 0 && (
                  <>
                    <div className="contacts-section-header">Contacts</div>
                    {filteredContacts.map((contact, idx) => (
                      <div
                        key={`contact-${idx}`}
                        className="iframe-contact-option"
                        onClick={() => handleSelectContact(contact)}
                      >
                        <div className="iframe-contact-option-name">{contact.c_Name}</div>
                        <div className="iframe-contact-option-phone">{contact.c_phoneNumber}</div>
                      </div>
                    ))}
                  </>
                )}

                {/* Agents Section */}
                {filteredAgents.length > 0 && (
                  <>
                    <div className="contacts-section-header">Agents</div>
                    {filteredAgents.map((agent, idx) => (
                      <div
                        key={`agent-${idx}`}
                        className="iframe-contact-option iframe-agent-option"
                        onClick={() => handleSelectAgent(agent)}
                      >
                        <div className="iframe-contact-option-name">
                          {agent.m_memberName}
                        </div>
                        <div className="iframe-contact-option-phone">
                          Ext: {agent.m_memberExtensionNo}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* No Results */}
                {filteredContacts.length === 0 && filteredAgents.length === 0 && (
                  <div className="iframe-no-results">
                    {searchTerm ? "No contacts or agents found" : "No contacts available"}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      <div className="iframe-dialpad-grid">
        {dialButtons.map(([num, letters], i) => (
          <button
            key={i}
            className="iframe-dial-button"
            onClick={() => {
              setPhoneNumber((prev) => prev + num);
              setIsAgentCall(false);
            }}
          >
            <p>{num}</p>
            {letters && <p className="iframe-dailpad-number-letters">{letters}</p>}
          </button>
        ))}
      </div>

      <div className="iframe-dialpad-footer-wrapper">
        <div className="iframe-dialpad-footer">
          <Button
            type="button"
            variant="empty"
            style={{
              border: "none",
              background: "transparent",
              opacity: callButtonDisabled ? 0.5 : 1,
              cursor: callButtonDisabled ? "not-allowed" : "pointer",
            }}
            // onClick={handleWhatsAppCall}
            // disabled={callButtonDisabled}
          >
            {/* <Icon name='whatsapp' size={40} color={callButtonDisabled ? "#919191" : "#53BA63"} /> */}
          </Button>
          <Button
            type="button"
            variant="empty"
            style={{
              border: "none",
              background: "transparent",
              opacity: callButtonDisabled ? 0.5 : 1,
              cursor: callButtonDisabled ? "not-allowed" : "pointer",
            }}
            onClick={handleCall}
            disabled={callButtonDisabled}
          >
            <Icon name='phonedialercall' size={40} color={callButtonDisabled ? "#919191" : "#2FC522"} />
          </Button>

          <Button type="button" variant="empty" onClick={() => {
            console.log(phoneNumber);
            setPhoneNumber(phoneNumber.slice(0, -1))
          }
          }>
            <Icon name='clearleftarrow' size={34} color="#00201C" />
          </Button>

        </div>
        <div className="iframe-dialpad-status">
          Status: {registrationStatus || "Invalid"}
          {callButtonDisabled && (
            <span style={{ color: "#ff6b6b", marginLeft: "10px" }}>
              • Call in progress
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Iframe;