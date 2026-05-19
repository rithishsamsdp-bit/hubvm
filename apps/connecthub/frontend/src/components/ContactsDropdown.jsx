import { useState, useRef, useEffect, useMemo } from "react";
import { DialpadStore } from "../store/useDialpadStore.js";
import Icon from "../constants/Icon.jsx"; // Adjust path as needed

const ContactsDropdown = ({
  onContactSelect,
  className = "",
  disabled = false,
  placeholder = "Search contacts...",
  maxHeight = "300px",
}) => {
  const { contactsData, getContacts } = DialpadStore();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter contacts based on search term
  const filteredContacts = useMemo(() => {
    if (!contactsData || contactsData.length === 0) return [];
    
    const term = searchTerm.trim().toLowerCase();
    if (!term) return contactsData;
    
    return contactsData.filter(contact => 
      contact.c_Name?.toLowerCase().includes(term) ||
      contact.c_phoneNumber?.toString().includes(term) ||
      contact.c_mailId?.toLowerCase().includes(term) ||
      contact.c_organizationName?.toLowerCase().includes(term)
    );
  }, [contactsData, searchTerm]);

  // Load contacts when component mounts
  useEffect(() => {
    if (contactsData.length === 0) {
      loadContacts();
    }
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      setActiveIndex(0);
    }
  }, [open]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      await getContacts();
    } catch (error) {
      console.error("Failed to load contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactSelect = (contact) => {
    onContactSelect?.(contact);
    setOpen(false);
    setSearchTerm("");
  };

  const scrollIntoView = (index) => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[index];
    if (!item) return;
    
    const itemTop = item.offsetTop;
    const itemBottom = itemTop + item.offsetHeight;
    const viewTop = list.scrollTop;
    const viewBottom = viewTop + list.clientHeight;
    
    if (itemTop < viewTop) {
      list.scrollTop = itemTop;
    } else if (itemBottom > viewBottom) {
      list.scrollTop = itemBottom - list.clientHeight;
    }
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = Math.min(activeIndex + 1, filteredContacts.length - 1);
      setActiveIndex(newIndex);
      scrollIntoView(newIndex);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = Math.max(activeIndex - 1, 0);
      setActiveIndex(newIndex);
      scrollIntoView(newIndex);
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const contact = filteredContacts[activeIndex];
      if (contact) {
        handleContactSelect(contact);
      }
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return "";
    const phoneStr = phone.toString();
    // Add basic formatting for readability
    if (phoneStr.length > 10) {
      return phoneStr.replace(/(\d{1,3})(\d{3})(\d{3})(\d{4})/, "+$1 $2 $3 $4");
    }
    return phoneStr;
  };

  return (
    <div
      ref={containerRef}
      className={`contacts-dropdown ${disabled ? "disabled" : ""} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        className="contacts-trigger-button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        title="Select Contact"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Icon name="contacts" size={16} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="contacts-dropdown-menu" style={{ maxHeight }}>
          {/* Search Input */}
          <div className="contacts-search-container">
            <div className="contacts-search-input-wrapper">
              <Icon name="search" size={14} className="contacts-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="contacts-search-input"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {/* Contacts List */}
          <div className="contacts-list" ref={listRef} role="listbox">
            {loading && (
              <div className="contacts-loading">
                <Icon name="loader" size={16} />
                <span>Loading contacts...</span>
              </div>
            )}

            {!loading && filteredContacts.length === 0 && (
              <div className="contacts-empty">
                {searchTerm ? "No matching contacts found" : "No contacts available"}
              </div>
            )}

            {!loading && filteredContacts.map((contact, index) => (
              <div
                key={contact.c_id || index}
                className={`contact-item ${index === activeIndex ? "active" : ""}`}
                onClick={() => handleContactSelect(contact)}
                role="option"
                aria-selected={index === activeIndex}
              >
                <div className="contact-avatar">
                  <span className="contact-initials">
                    {getInitials(contact.c_Name)}
                  </span>
                </div>
                <div className="contact-details">
                  <div className="contact-name">
                    {contact.c_Name || "Unknown"}
                  </div>
                  <div className="contact-phone">
                    {formatPhoneNumber(contact.c_phoneNumber)}
                  </div>
                  {contact.c_organizationName && (
                    <div className="contact-org">
                      {contact.c_organizationName}
                    </div>
                  )}
                </div>
                <div className="contact-actions">
                  <Icon name="phone" size={14} className="contact-call-icon" />
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          {!loading && filteredContacts.length > 0 && (
            <div className="contacts-footer">
              <small>{filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContactsDropdown;