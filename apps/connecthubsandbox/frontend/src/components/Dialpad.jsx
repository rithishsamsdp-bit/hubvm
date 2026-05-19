import React, { useState, useEffect, useRef } from "react";
import "./styles/dialpad.css";
import { callStore } from "../store/useCallStore";
import { DialpadStore } from "../store/agent/useDialpadStore";
import { useConversationStore } from "../store/agent/useConversationStore";
import { useAuthStore } from "../store/useAuthStore";
import { Button, Input, Loader } from "./Index.jsx";
import { useNavigate } from "react-router-dom";
import Icon from "../constants/Icon.jsx";
import { countries } from "../utils/helpers.js";

const DialPad = ({ onCallInitiated }) => {
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
  const [lastCalledNumber, setLastCalledNumber] = useState(
    storedLastCall?.number || ""
  );
  const [lastCalledWasAgent, setLastCalledWasAgent] = useState(
    storedLastCall?.wasAgent || false
  );

  const dialpadRef = useRef(null);
  const inputRef = useRef(null);

  const { makeCall, makeWhatsCall, initUA, registrationStatus, activeCalls } =
    callStore();
  const {
    agentCampaignData,
    getCampaigns,
    contactsData,
    getContacts,
    getContactLoading,
  } = DialpadStore();
  const {
    selectedCampaign,
    updateCampaign,
    fetchFormByCampaign,
    getAgents,
    agentsData,
  } = useConversationStore();

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
        name: storedCampaignName,
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
      inputRef.current.focus();
    }
  }, [showContacts, showDropdown, showCampaigns]);

  useEffect(() => {
    if (selectedCountry) {
      localStorage.setItem("selectedCountry", JSON.stringify(selectedCountry));
    }
  }, [selectedCountry]);

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
      wasAgent: isAgentCall,
    };
    localStorage.setItem("lastCalledNumber", JSON.stringify(callData));
    console.log("Saved to localStorage:", callData);

    setLastCalledNumber(fullNumber);
    setLastCalledWasAgent(isAgentCall);

    makeCall(fullNumber, navigate, selectedCampaign.value);
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
      wasAgent: false,
    };
    localStorage.setItem("lastCalledNumber", JSON.stringify(callData));

    setLastCalledNumber(fullNumber);
    setLastCalledWasAgent(false);

    makeWhatsCall(fullNumber, navigate, selectedCampaign.value);
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

      makeCall(numberToCall, navigate, selectedCampaign.value);

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

    // Store Dialertype if available, else default to MANUAL
    const dialerType = camp.dialertype || "MANUAL";
    localStorage.setItem("dialerType", dialerType);

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
    ? contactsData.filter(
      (contact) =>
        contact.c_Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.c_phoneNumber?.includes(searchTerm)
    )
    : [];

  const filteredAgents = Array.isArray(agentsData)
    ? agentsData.filter(
      (agent) =>
        agent.m_memberName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        agent.m_memberExtensionNo?.toString().includes(searchTerm)
    )
    : [];

  const callButtonDisabled = isCallDisabled();

  // Check if current campaign is selected
  const isCampaignSelected = (campId) => {
    return selectedCampaign?.value === campId;
  };

  return (
    <div className="dialpad-container" ref={dialpadRef}>
      <div className="dialpad-header">
        Campaign:
        <div
          className={`dialpad-campaign-select ${showCampaigns ? "active" : ""}`}
          onClick={toggleCampaigns}
        >
          {selectedCampaign?.label || "Select Campaign"}
          <Icon
            name="chevrondown"
            size={10}
            className={`campaign-select-icon ${showCampaigns ? "open" : ""}`}
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
            cursor:
              !lastCalledNumber || callButtonDisabled
                ? "not-allowed"
                : "pointer",
          }}
          title={
            lastCalledNumber
              ? `Redial: ${lastCalledNumber}`
              : "No previous call"
          }
        >
          <Icon
            name="callredial"
            size={28}
            color={
              !lastCalledNumber || callButtonDisabled ? "#919191" : "#2FC522"
            }
          />
        </Button>
      </div>

      {/* Enhanced Campaign Dropdown */}
      {showCampaigns && (
        <div className="campaign-dropdown">
          <div className="campaign-dropdown-header">Select Campaign</div>

          {/* Individual Option */}
          <div
            key="individual-0"
            className={`campaign-option ${isCampaignSelected(0) ? "selected" : ""
              }`}
            onClick={() =>
              handleSelectCampaign({
                c_campaignName: "Individual",
                c_campaignId: 0,
              })
            }
          >
            <div className="campaign-option-icon">
              <Icon name="user" size={12} />
            </div>
            <div className="campaign-option-content">
              <span className="campaign-option-name">Individual</span>
            </div>
            <span className="campaign-option-badge individual">Personal</span>
            {isCampaignSelected(0) && (
              <span className="campaign-option-checkmark">✓</span>
            )}
          </div>

          {/* Campaign List */}
          {Array.isArray(agentCampaignData) && agentCampaignData.length > 0 ? (
            <>
              <div className="campaign-dropdown-divider"></div>

              {agentCampaignData
                .filter(
                  (camp) =>
                    camp?.c_campaignId && // id null / undefined / empty avoid
                    camp?.c_campaignName // name null / undefined avoid
                  // camp.c_campaignName.trim() !== ''     // empty string avoid
                )
                .map((camp, idx) => (
                  <div
                    key={`${camp.m_memberId}-${idx}`}
                    className={`campaign-option ${isCampaignSelected(camp.c_campaignId) ? "selected" : ""
                      }`}
                    onClick={() => handleSelectCampaign(camp)}
                  >
                    <div className="campaign-option-icon">
                      {camp.c_campaignName.charAt(0).toUpperCase()}
                    </div>

                    <div className="campaign-option-content">
                      <span className="campaign-option-name">
                        {camp.c_campaignName}
                      </span>
                    </div>

                    <span className="campaign-option-badge active">Active</span>

                    {isCampaignSelected(camp.c_campaignId) && (
                      <span className="campaign-option-checkmark">✓</span>
                    )}
                  </div>
                ))}
            </>
          ) : (
            <div className="campaign-dropdown-empty">
              No campaigns available
            </div>
          )}
        </div>
      )}

      <p className="dialpad-numlabel">Enter Number</p>
      <div className="dialpad-input-box">
        {isAgentCall ? (
          <div className="dialpad-country-selector">
            <Icon name="user" color="#636363" size={14} />
          </div>
        ) : (
          <div className="dialpad-country-selector" onClick={toggleCountries}>
            <Icon
              name={selectedCountry.code.toLowerCase()}
              size={24}
              className="dialpad-flag-icon"
            />
            <span className="dialpad-country-name">{selectedCountry.code}</span>
            <span className="dialpad-country-code">{selectedCountry.dial}</span>
          </div>
        )}

        <Icon name="dialpadinputdivider" color="#002449" size={14} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Enter"
          className="dialpad-input-field"
          value={phoneNumber}
          maxLength={15}
          inputMode="numeric"
          onChange={(e) => {
            const filtered = e.target.value.replace(/[^0-9*#]/g, "");
            setPhoneNumber(filtered.slice(0, 15));
            setIsAgentCall(false);
          }}
          onKeyPress={handleKeyPress}
        />
        <Button
          type="button"
          variant="empty"
          onClick={toggleContacts}
          className="dialpad-contact-icon"
        >
          <Icon name="contactbook" size={22} color="#636363" />
        </Button>

        {showDropdown && (
          <div className="country-dropdown">
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
                const isAllowed = Array.isArray(allowedCountries) && allowedCountries.length > 0 
                   ? allowedCountries.includes(country.code)
                   : true;
                
                return isAllowed && (
                  country.name.toLowerCase().includes(search) ||
                  country.code.toLowerCase().includes(search) ||
                  country.dial.includes(search)
                );
              })
              .map((country) => (
                <div
                  key={country.code}
                  className="dialpad-country-option"
                  onClick={() => handleSelectCountry(country)}
                >
                  <Icon
                    name={country.code.toLowerCase()}
                    size={32}
                    className="flag-icon"
                  />
                  <span className="dial-name">{country.name}</span>
                  <span className="dial-code">{country.dial}</span>
                </div>
              ))}
          </div>
        )}

        {showContacts && (
          <div className="contacts-panel">
            <div className="contacts-search-wrapper">
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
              <div className="contacts-list">
                {/* Contacts Section */}
                {filteredContacts.length > 0 && (
                  <>
                    <div className="contacts-section-header">Contacts</div>
                    {filteredContacts.map((contact, idx) => (
                      <div
                        key={`contact-${idx}`}
                        className="contact-option"
                        onClick={() => handleSelectContact(contact)}
                      >
                        <div className="contact-option-name">
                          {contact.c_Name}
                        </div>
                        <div className="contact-option-phone">
                          {contact.c_phoneNumber}
                        </div>
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
                        className="contact-option agent-option"
                        onClick={() => handleSelectAgent(agent)}
                      >
                        <div className="contact-option-name">
                          {agent.m_memberName}
                        </div>
                        <div className="contact-option-phone">
                          Ext: {agent.m_memberExtensionNo}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* No Results */}
                {filteredContacts.length === 0 &&
                  filteredAgents.length === 0 && (
                    <div className="no-results">
                      {searchTerm
                        ? "No contacts or agents found"
                        : "No contacts available"}
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="dialpad-grid">
        {dialButtons.map(([num, letters], i) => (
          <button
            key={i}
            className="dial-button"
            onClick={() => {
              setPhoneNumber((prev) => prev + num);
              setIsAgentCall(false);
            }}
          >
            <p>{num}</p>
            {letters && <p className="dailpad-number-letters">{letters}</p>}
          </button>
        ))}
      </div>

      <div className="dialpad-footer-wrapper">
        <div className="dialpad-footer">
          {authPlan?.menu?.whatsapp ? (
            <Button
              type="button"
              variant="empty"
              style={{
                border: "none",
                background: "transparent",
                opacity: callButtonDisabled ? 0.5 : 1,
                cursor: callButtonDisabled ? "not-allowed" : "pointer",
              }}
              onClick={handleWhatsAppCall}
              disabled={callButtonDisabled}
            >
              <Icon
                name="whatsapp"
                size={40}
                color={callButtonDisabled ? "#919191" : "#53BA63"}
              />
            </Button>
          ) : (
            <div style={{ width: '40px', height: '40px', visibility: 'hidden' }}></div>
          )}
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
            <Icon
              name="phonedialercall"
              size={40}
              color={callButtonDisabled ? "#919191" : "#2FC522"}
            />
          </Button>

          <Button
            type="button"
            variant="empty"
            onClick={() => {
              console.log(phoneNumber);
              setPhoneNumber(phoneNumber.slice(0, -1));
            }}
          >
            <Icon name="clearleftarrow" size={34} color="#00201C" />
          </Button>
        </div>
        <div className="dialpad-status">
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

export default DialPad;
