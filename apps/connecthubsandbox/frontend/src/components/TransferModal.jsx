import { useState, useEffect } from "react";
import { Modal, Button, Input, Select, Radio, Switch } from "./Index.jsx";
import { DialpadStore } from "../store/agent/useDialpadStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import "./styles/TransferModal.css";
import { useConversationStore } from "../store/agent/useConversationStore.js";
import { getAvatarText, getAvatarColor } from "../utils/helpers.js";
import Icon from "../constants/CallingBar_Icons.jsx";
import CountryCodeDropdown, { DEFAULT_DIAL } from "../components/CountryCodeDropdown.jsx";
import { formatPhoneWithCountryCode, isValidPhoneNumber } from "../components/countryUtils.js";

const TransferModal = ({
  open,
  onClose,
  onTransfer,
  transferMode = "Cold",
  onTransferModeChange,
  isConsulting = false,
  onCancelWarmTransfer,
  onCompleteWarmTransfer,
  onSwitchCalls,
  callHold = false,
}) => {
  const { contactsData, getContacts } = DialpadStore();
  const { agentsData, agentsLoading, getAgents } = useConversationStore();
  const { authPlan } = useAuthStore();
  
  const transferOptions = [
    ...(authPlan?.options?.dialpad?.internalTransfer === true ? [{ label: "Agents", value: "Agents" }] : []),
    ...(authPlan?.options?.dialpad?.externalTransfer === true ? [{ label: "External", value: "External" }] : []),
  ];

  const [transferType, setTransferType] = useState(transferOptions[0]?.value || "Agents");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [externalNumber, setExternalNumber] = useState("");
  const [externalCountryCode, setExternalCountryCode] = useState(DEFAULT_DIAL);
  const [transferErrors, setTransferErrors] = useState({});
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactsLoading, setContactsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // Auto-set the first available mode and its linked type
      const canCold = authPlan?.options?.dialpad?.internalTransfer === true;
      const canWarm = authPlan?.options?.dialpad?.externalTransfer === true;
      
      if (canCold && !canWarm) {
        onTransferModeChange?.("Cold");
        setTransferType("Agents");
      } else if (!canCold && canWarm) {
        onTransferModeChange?.("Warm");
        setTransferType("External");
      } else if (canCold && canWarm) {
        // If both enabled, keep default Cold/Agents
        onTransferModeChange?.("Cold");
        setTransferType("Agents");
      }

      // Load contacts if not already loaded
      if (contactsData.length === 0) {
        loadContacts();
      }
      // Load agents if not already loaded
      if (agentsData.length === 0) {
        loadAgents();
      }
    }
  }, [open]);

  const loadContacts = async () => {
    setContactsLoading(true);
    try {
      await getContacts();
    } catch (error) {
      console.error("Failed to load contacts:", error);
    } finally {
      setContactsLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      await getAgents();
    } catch (error) {
      console.error("Failed to load agents:", error);
    }
  };

  const contactOptions = contactsData.map((contact) => ({
    value: contact.c_id,
    label: `${contact.c_Name} - ${contact.c_phoneNumber}`,
    children: (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          gap: "8px",
          padding: "4px 0",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor:
              contact.colour ||
              getAvatarColor(contact.c_Name || contact.c_phoneNumber),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "11px",
            fontWeight: "600",
            flexShrink: 0,
          }}
        >
          {getAvatarText(contact.c_Name || contact.c_phoneNumber)}
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontWeight: 500,
              fontSize: "13px",
              color: "#111827",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {contact.c_Name}
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "#6b7280",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {contact.c_phoneNumber}
          </span>
        </div>
        <Icon name="contactBook" size={12} color="#9ca3af" />
      </div>
    ),
    searchLabel: `${contact.c_Name} ${contact.c_phoneNumber}`,
    contact: contact,
  }));

  const handleContactSelect = (contactId) => {
    const contact = contactsData.find((c) => c.c_id === contactId);
    if (contact) {
      setSelectedContact(contact);

      const phoneStr = contact.c_phoneNumber?.toString() || "";
      const storedCountryCode = contact.c_countryCode?.toString();

      let countryCode = DEFAULT_DIAL;
      let localNumber = phoneStr;

      if (storedCountryCode && storedCountryCode.trim()) {
        countryCode = storedCountryCode.trim();

        if (phoneStr.startsWith(countryCode)) {
          localNumber = phoneStr.slice(countryCode.length);
        } else if (phoneStr.startsWith("+" + countryCode)) {
          localNumber = phoneStr.slice(countryCode.length + 1);
        } else {
          localNumber = phoneStr;
        }
      }

      setExternalNumber(localNumber);
      setExternalCountryCode(countryCode);

      setTransferErrors((prev) => ({
        ...prev,
        externalNumber: "",
        countryCode: "",
        contact: "",
      }));
    }
  };

  const validateTransferForm = () => {
    const errors = {};

    if (transferType === "Agents" && !selectedAgent) {
      errors.agent = "Please select an agent";
    }

    if (transferType === "External") {
      if (!selectedContact && !externalNumber.trim()) {
        errors.contact = "Please select a contact or enter a phone number";
      } else if (externalNumber.trim() && !isValidPhoneNumber(externalNumber)) {
        errors.externalNumber = "Please enter a valid phone number";
      }

      if (!externalCountryCode) {
        errors.countryCode = "Country code is required";
      }
    }

    setTransferErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTransferSubmit = () => {
    if (!validateTransferForm()) {
      return;
    }

    let transferTarget;

    if (transferType === "Agents") {
      transferTarget = selectedAgent;
    } else {
      if (selectedContact && selectedContact.c_phoneNumber) {

        transferTarget = formatPhoneWithCountryCode(
          externalNumber, // parsed local number
          externalCountryCode // parsed country code
        );
        transferTarget = transferTarget.replace("+", ""); // Remove + for SIP
        
        // TESTING: Try without country code if the above doesn't work
        // transferTarget = externalNumber; // Just the local number
        
        console.log("Selected contact transfer details:", {
          originalPhone: selectedContact.c_phoneNumber,
          parsedCountryCode: externalCountryCode,
          parsedLocalNumber: externalNumber,
          finalTarget: transferTarget
        });
        
      } else {
        // For manual entry
        transferTarget = formatPhoneWithCountryCode(
          externalNumber,
          externalCountryCode
        );
        transferTarget = transferTarget.replace("+", "");
        
        console.log("Manual entry transfer details:", {
          enteredNumber: externalNumber,
          enteredCountryCode: externalCountryCode,
          finalTarget: transferTarget
        });
      }
    }

    if (transferTarget) {
      console.log("Attempting transfer with target:", transferTarget);
      onTransfer?.(transferTarget, transferType, transferMode);
      if (transferMode === "Cold") {
        handleCancel();
      }
    }
  };

  const handleExternalNumberChange = (e) => {
    const value = e.target.value;
    if (/^[0-9*#]*$/.test(value)) {
      setExternalNumber(value);
      if (selectedContact) {
        setSelectedContact(null);
      }
      if (transferErrors.externalNumber) {
        setTransferErrors((prev) => ({
          ...prev,
          externalNumber: "",
          contact: "",
        }));
      }
    }
  };

  const handleCountryCodeChange = (dialCode, countryObj) => {
    setExternalCountryCode(dialCode);
    if (selectedContact) {
      setSelectedContact(null);
    }
    if (transferErrors.countryCode) {
      setTransferErrors((prev) => ({ ...prev, countryCode: "" }));
    }
  };

  const handleCancel = () => {
    setTransferType("Agents");
    setSelectedAgent(null);
    setExternalNumber("");
    setExternalCountryCode(DEFAULT_DIAL);
    setSelectedContact(null);
    setTransferErrors({});
    onClose?.();
  };

  const clearSelectedContact = () => {
    setSelectedContact(null);
    setExternalNumber("");
    setExternalCountryCode(DEFAULT_DIAL);
  };

  const getPreviewNumber = () => {
    if (selectedContact) {
      const contactPhone = selectedContact.c_phoneNumber?.toString() || "";
      const storedCountryCode = selectedContact.c_countryCode?.toString();

      if (storedCountryCode && storedCountryCode.trim()) {
        if (contactPhone.startsWith("+")) {
          return contactPhone;
        }
        if (contactPhone.startsWith(storedCountryCode)) {
          return `+${contactPhone}`;
        }
        return `+${storedCountryCode}${contactPhone}`;
      } else {
        if (contactPhone.startsWith("+")) {
          return contactPhone;
        }
        const commonCodes = [
          "971", "358", "91", "44", "49", "33", "81", "46", "47", "41", "31", "45", "61", "64", "65", "82", "32",
        ];
        for (const code of commonCodes) {
          if (contactPhone.startsWith(code) && contactPhone.length > code.length) {
            return `+${contactPhone}`;
          }
        }
        if (contactPhone.startsWith("1") && contactPhone.length > 10) {
          return `+${contactPhone}`;
        }
        return `+${DEFAULT_DIAL}${contactPhone}`;
      }
    } else {
      return formatPhoneWithCountryCode(externalNumber, externalCountryCode);
    }
  };

  return (
    <Modal open={open} width="520px" onClose={handleCancel}>
      <div className="transfer-modal-wrapper">
        <div className="transfer_modal_container">
          <p className="transfer_modal_header">Call Transfer</p>
          <Button variant="empty" onClick={handleCancel}>
            <Icon name="close" color="#0F172A" size="14" />
          </Button>
        </div>

        <div className="transfer_tabs">
          {authPlan?.options?.dialpad?.internalTransfer === true && (
            <div
              role="tab"
              className={`select_tab px-4 py-2 cursor-pointer ${
                transferMode === "Cold" ? "selected" : ""
              }`}
              onClick={() => {
                onTransferModeChange?.("Cold");
                setTransferType("Agents");
              }}
              aria-label="Select Cold Transfer"
              aria-selected={transferMode === "Cold"}
            >
              Cold Transfer
            </div>
          )}
          {authPlan?.options?.dialpad?.externalTransfer === true && (
            <div
              role="tab"
              className={`select_tab px-4 py-2 cursor-pointer ${
                transferMode === "Warm" ? "selected" : ""
              }`}
              onClick={() => {
                onTransferModeChange?.("Warm");
                setTransferType("External");
              }}
              aria-label="Select Warm Transfer"
              aria-selected={transferMode === "Warm"}
            >
              Warm Transfer
            </div>
          )}
        </div>

        <div className="transfer_modal_body">
          {/* Radio selection hidden as it's now tied to Tabs mela */}


          {transferType === "Agents" && authPlan?.options?.dialpad?.internalTransfer === true ? (
            <>
              <label className="form_label" htmlFor="agentSelect">
                Select Agent
              </label>
              <Select
                id="agentSelect"
                name="agentSelect"
                placeholder={agentsLoading ? "Loading agents..." : "Select Agent"}
                allowClear
                showSearch
                value={selectedAgent}
                loading={agentsLoading}
                onChange={(val) => {
                  setSelectedAgent(val);
                  if (transferErrors.agent) {
                    setTransferErrors((prev) => ({ ...prev, agent: "" }));
                  }
                }}
                options={agentsData.map(agent => ({
                  label: `${agent.m_memberName} - ${agent.m_memberExtensionNo}`,
                  value: agent.m_memberExtensionNo.toString(),
                  searchLabel: `${agent.m_memberName} ${agent.m_memberExtensionNo}`,
                  children: (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      gap: "8px",
                      padding: "4px 0"
                    }}>
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: getAvatarColor(agent.m_memberName),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "11px",
                        fontWeight: "600",
                        flexShrink: 0
                      }}>
                        {getAvatarText(agent.m_memberName)}
                      </div>
                      <div style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 0
                      }}>
                        <span style={{
                          fontWeight: 500,
                          fontSize: "13px",
                          color: "#111827",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}>
                          {agent.m_memberName}
                        </span>
                        <span style={{
                          fontSize: "11px",
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}>
                          Extension: {agent.m_memberExtensionNo}
                        </span>
                      </div>
                      <Icon name="user" size={12} color="#9ca3af" />
                    </div>
                  )
                }))}
                filterOption={(input, option) => {
                  const name = option.searchLabel?.toLowerCase() || "";
                  return name.includes(input.toLowerCase());
                }}
              />
              {transferErrors.agent && (
                <div className="transfer-error-message" style={{
                  color: "#ef4444", fontSize: "14px", marginTop: "4px"
                }}>
                  {transferErrors.agent}
                </div>
              )}
            </>
          ) : (
            authPlan?.options?.dialpad?.externalTransfer === true && (
  <>
    {/* Contact Selection */}
    <div>
      <label className="form_label" htmlFor="contactSelect">
        Select Contact
      </label>
      <Select
        id="contactSelect"
        name="contactSelect"
        placeholder={contactsLoading ? "Loading contacts..." : "Select a contact"}
        allowClear
        showSearch
        value={selectedContact?.c_id}
        onChange={handleContactSelect}
        options={contactOptions}
        loading={contactsLoading}
        filterOption={(input, option) => {
          const name = option.contact?.c_Name?.toString().toLowerCase() || "";
          const phone = option.contact?.c_phoneNumber?.toString().toLowerCase() || "";
          return (
            name.includes(input.toLowerCase()) ||
            phone.includes(input.toLowerCase())
          );
        }}
      />
      {transferErrors.contact && (
        <div className="transfer-error-message">
          {transferErrors.contact}
        </div>
      )}
    </div>

    {/* Selected Contact Banner */}
    {selectedContact && (
      <div className="selected-contact-banner">
        <div className="selected-contact-content">
          <div className="selected-contact-avatar">
            {selectedContact.c_Name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="selected-contact-info">
            <div className="selected-contact-name">
              {selectedContact.c_Name}
            </div>
            <div className="selected-contact-phone">
              {selectedContact.c_phoneNumber}
            </div>
            {selectedContact.c_organizationName && (
              <div className="selected-contact-org">
                {selectedContact.c_organizationName}
              </div>
            )}
          </div>
        </div>
        <button onClick={clearSelectedContact} className="clear-contact-btn" title="Clear selected contact">
          <Icon name="close" size={14} />
        </button>
      </div>
    )}

    {/* Manual Entry Section */}
    <div>
      <div className="manual-entry-divider">
        <hr />
        <span>Or enter manually</span>
        <hr />
      </div>

      <div>
        <label className="form_label" htmlFor="phoneInput">Enter Number</label>
        <div className="combined-phone-input">
          <div className="country-code-section">
            <CountryCodeDropdown
              value={externalCountryCode}
              onChange={handleCountryCodeChange}
              error={transferErrors.countryCode}
              placeholder="Select country"
              compact={true}
            />
          </div>
          <div className="phone-number-section">
            <input
              id="phoneInput"
              className="phone-number-input"
              placeholder="Enter"
              value={externalNumber}
              onChange={handleExternalNumberChange}
            />
          </div>
        </div>
        {(transferErrors.externalNumber || transferErrors.countryCode) && (
          <div className="transfer-error-message">
            {transferErrors.externalNumber || transferErrors.countryCode}
          </div>
        )}
      </div>
    </div>
  </>
            )
          )}

          {isConsulting && (
            <div className="consultation-controls">
              <div className="warm_switch">
                <label className="form_label">Transfer Call</label>
                <Switch
                  checked={callHold}
                  onChange={onSwitchCalls}
                  aria-label="Switch between original and consultation call"
                />
              </div>
              <div className="transfer-actions">
                <Button variant="secondary" onClick={onCancelWarmTransfer}>
                  Cancel Transfer
                </Button>
                <Button variant="primary" onClick={onCompleteWarmTransfer}>
                  Complete Transfer
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="transfer_modal_footer">
          {(selectedContact || externalNumber) && (
            <div style={{
              padding: "8px 12px", background: "#f9fafb", borderRadius: "6px",
              fontSize: "14px", color: "#6b7280", marginBottom: "12px"
            }}>
              <strong>Will transfer to:</strong> {getPreviewNumber()}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleTransferSubmit}
              disabled={isConsulting}
            >
              {transferMode === "Cold" ? "Transfer" : "Start Transfer"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TransferModal;