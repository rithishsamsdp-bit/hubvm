import { useState, useCallback, useRef, useEffect } from 'react';
import "./styles/MessageInputBox.css";
import icons from '../../../constants/icon';
import Icon from "../../../constants/Icon.jsx";
import { Button, Loader, Select } from '../../../components/Index';
import { useAuthStore } from '../../../store/useAuthStore';
import { useWhatsappStore } from '../../../store/agent/useWhatsappStore';
import { useSmsStore } from '../../../store/agent/useSmsStore';
import EmojiPicker from 'emoji-picker-react';

const MessageInputBox = ({ data }) => {
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);
  const { agentpanel_files_icon, agentpanel_import_icon, agentpanel_send_icon } = icons;
  const { authExtension, authUser, authPlan } = useAuthStore();
  const { sentWAMessage, sentWAMessageLoading, fetchWhatsappTemplates, sendManualTemplate } = useWhatsappStore();
  const { sendSMSMessage, sentSmsLoading } = useSmsStore();

  const [messageInput, setMessageInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showSendOptions, setShowSendOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // If both Whatsapp and SMS are disabled, do not render the input box at all
  if (!authPlan?.menu?.whatsapp && !authPlan?.menu?.sms) {
    return null;
  }


  const sendOptionsRef = useRef(null);

  // Close send options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sendOptionsRef.current && !sendOptionsRef.current.contains(event.target)) {
        setShowSendOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Template dropdown state
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateVariables, setTemplateVariables] = useState({});

  // Close dropdown and emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowTemplateDropdown(false);
        setShowTemplateList(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus the input when a conversation is selected
  useEffect(() => {
    if (data && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [data?.c_conversationId]);

  // Parse variables from selected template
  useEffect(() => {
    if (selectedTemplate?.templateText) {
      const regex = /{{(\d+)}}/g;
      const matches = [...selectedTemplate.templateText.matchAll(regex)];
      const variables = {};
      matches.forEach(match => {
        variables[match[1]] = "";
      });
      setTemplateVariables(variables);
    } else {
      setTemplateVariables({});
    }
  }, [selectedTemplate]);

  // Handle emoji selection
  const handleEmojiClick = useCallback((emojiData) => {
    const emoji = emojiData.unified
      ? String.fromCodePoint(...emojiData.unified.split('-').map(u => parseInt(u, 16)))
      : emojiData.emoji;
    setMessageInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  const handleMessageInputChange = useCallback((value) => {
    setMessageInput(value);
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const type = file.type;
      if (type.startsWith('image/') || type.startsWith('video/')) {
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);
      } else {
        setPreviewUrl(null);
      }
    }
  }, []);

  const handleFileUploadClick = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
  }, []);

  const handlewhatsappMessageSend = async () => {
    // If a template is selected, send the template
    if (selectedTemplate) {
      const agentExtension = String(authUser?.m_memberExtensionNo || authExtension || "");
      const phoneNumber = String(data.c_conversationPhoneNo || "");

      // Convert variables object to array based on indices
      const sortedKeys = Object.keys(templateVariables).sort((a, b) => parseInt(a) - parseInt(b));
      const variablesArray = sortedKeys.map(key => templateVariables[key]);

      await sendManualTemplate(
        selectedTemplate.templateId,
        selectedTemplate.templateName,
        phoneNumber,
        agentExtension,
        variablesArray
      );

      setSelectedTemplate(null);
      setTemplateVariables({});
      setShowTemplateDropdown(false);
      setShowTemplateList(false);
      return;
    }

    if (!messageInput && !selectedFile) return alert('Please type a message or select a file.');

    const formData = new FormData();
    formData.append('dst', data.c_conversationPhoneNo);
    formData.append('agent', authExtension);
    formData.append('message', messageInput || '');

    if (selectedFile) {
      formData.append('file', selectedFile);
      const type = selectedFile.type;
      let mediaType = 'file';
      if (type.startsWith('image/')) mediaType = 'image';
      else if (type.startsWith('video/')) mediaType = 'video';
      else if (type.startsWith('audio/')) mediaType = 'audio';
      formData.append('mediaType', mediaType);
      formData.append('fileName', selectedFile.name);
    } else {
      formData.append('mediaType', 'text');
      formData.append('fileName', '');
    }

    await sentWAMessage(formData, messageInput);
    setMessageInput('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowSendOptions(false);
  };

  const handleSMSMessageSend = async () => {
    if (!messageInput) return alert('Please type a message to send via SMS.');
    if (selectedFile) return alert('SMS does not support file attachments in this version. Please send via WhatsApp or remove the file.');

    await sendSMSMessage(data, messageInput);
    setMessageInput('');
    setShowSendOptions(false);
  };

  const handleSmartSend = () => {
    const hasWhatsapp = authPlan?.menu?.whatsapp;
    const hasSms = authPlan?.menu?.sms;
    
    if (hasWhatsapp && !hasSms) {
      handlewhatsappMessageSend();
    } else if (!hasWhatsapp && hasSms) {
      handleSMSMessageSend();
    } else if (hasWhatsapp && hasSms) {
      setShowSendOptions(prev => !prev);
    }
  };

  const handleTemplateDropdownClick = () => {
    setShowTemplateDropdown(!showTemplateDropdown);
    setShowTemplateList(false);
  };

  const handleSendTemplateClick = async () => {
    setTemplatesLoading(true);
    const fetchedTemplates = await fetchWhatsappTemplates();
    setTemplates(fetchedTemplates);
    setTemplatesLoading(false);
    setShowTemplateList(true);
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setShowTemplateDropdown(false);
    setShowTemplateList(false);
  };

  return (
    <div className="conversation_message_input_wrapper">

      {/* ---------- Selected Template preview ---------- */}
      {selectedTemplate && (
        <div className="wa-file-preview">
          <div className="wa-template-preview">
            <div className="wa-template-header">
              <div className="wa-template-preview-icon"><Icon name="template_review" size={24} color="#FFFFFF" /></div>
              <div className="wa-template-preview-info">
                <span className="wa-template-preview-label">Template Selected</span>
                <p className="wa-template-preview-name">
                  {selectedTemplate.templateName.length > 30
                    ? selectedTemplate.templateName.slice(0, 30) + '...'
                    : selectedTemplate.templateName}
                </p>
              </div>
            </div>

            <div className="wa-template-full-text">
              {(() => {
                if (!selectedTemplate.templateText) return null;

                const text = selectedTemplate.templateText;
                const parts = text.split(/({{.*?}})/g);

                return parts.map((part, index) => {
                  const match = part.match(/{{(\d+)}}/);
                  if (match) {
                    const variableIndex = match[1];
                    return (
                      <span key={index} className="wa-variable-container">
                        <input
                          type="text"
                          placeholder={`{{${variableIndex}}}`}
                          className="wa-inline-variable-input"
                          value={templateVariables[variableIndex] || ''}
                          onChange={(e) => setTemplateVariables(prev => ({ ...prev, [variableIndex]: e.target.value }))}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </span>
                    );
                  }
                  return <span key={index}>{part}</span>;
                });
              })()}
            </div>

            <p className="wa-template-preview-hint">Review and click Send</p>
            <button className="wa-template-remove-btn" onClick={() => { setSelectedTemplate(null); setTemplateVariables({}); }}>✖</button>
          </div>
        </div>
      )}

      {/* ---------- File preview ---------- */}
      {selectedFile && (
        <div className="wa-file-preview">
          {previewUrl ? (
            <div className="wa-media-preview">
              {selectedFile.type.startsWith('image/') ? (
                <img src={previewUrl} alt="preview" className="wa-preview-img" />
              ) : (
                <video src={previewUrl} className="wa-preview-video" controls />
              )}
              <button className="wa-remove-btn" onClick={handleRemoveFile}>✖</button>
            </div>
          ) : (
            <div className="wa-input-file-card">
              <div className="wa-input-file-icon">📎</div>
              <div className="wa-input-file-info">
                <p className="wa-input-file-name">
                  {selectedFile.name.length > 20
                    ? selectedFile.name.slice(0, 20) + '...'
                    : selectedFile.name}
                </p>
                <p className="wa-input-file-size">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button className="wa-remove-btn" onClick={handleRemoveFile}>✖</button>
            </div>
          )}
        </div>
      )}

      {/* ---------- Input bar ---------- */}
      <div className="conversation_message_input_container">
        <textarea
          placeholder="Type a message"
          className="conversation_message_input"
          ref={inputRef}
          value={messageInput}
          rows={1}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onChange={(e) => handleMessageInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSmartSend();
              e.target.style.height = 'auto';
            }
          }}
        />

        <div className="conversation_message_icons">
          <img
            src={agentpanel_files_icon}
            alt="Attach"
            className="icon"
            style={{ cursor: 'pointer' }}
            onClick={handleFileUploadClick}
          />
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* Emoji picker */}
          <div className="wa-emoji-container" ref={emojiPickerRef}>
            <span
              className="wa-emoji-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add emoji"
            >
              😊
            </span>
            {showEmojiPicker && (
              <div className="wa-emoji-picker-popup">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  width={320}
                  height={400}
                  searchPlaceHolder="Search emoji..."
                  skinTonesDisabled
                />
              </div>
            )}
          </div>

          {/* Template dropdown */}
          {authPlan?.menu?.whatsapp && (
            <div className="wa-template-dropdown-container" ref={dropdownRef}>
              <img
                src={agentpanel_import_icon}
                alt="Upload"
                className="icon"
                style={{ cursor: 'pointer' }}
                onClick={handleTemplateDropdownClick}
              />

              {showTemplateDropdown && (
                <div className="wa-template-dropdown">
                  <div
                    className="wa-template-dropdown-item"
                    onClick={handleSendTemplateClick}
                  >
                    📋 Send Template
                  </div>
                  {showTemplateList && (
                    <div className="wa-template-list">
                      {templatesLoading ? (
                        <div className="wa-template-loading">
                          <Loader size="small" />
                          <span>Loading...</span>
                        </div>
                      ) : templates.length > 0 ? (
                        <Select
                          placeholder="Select template"
                          options={templates.map(t => ({
                            label: t.templateName,
                            value: t.templateId
                          }))}
                          onChange={(value) => {
                            const template = templates.find(t => t.templateId === value);
                            if (template) {
                              handleTemplateSelect(template);
                            }
                          }}
                        />
                      ) : (
                        <div className="wa-template-empty">
                          No templates
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="conversation_message_icons_vertical_line"></div>

          <div className="custom-send-wrapper" ref={sendOptionsRef}>
            {showSendOptions && (
              <div className="custom-send-options">
                {authPlan?.menu?.whatsapp && (
                  <div
                    className={`send-option whatsapp ${(sentWAMessageLoading || sentSmsLoading) ? 'disabled' : ''}`}
                    onClick={handlewhatsappMessageSend}
                  >
                    <Icon name="whatsapp" color="#25D366" size={18} />
                    <span>WhatsApp</span>
                    {sentWAMessageLoading && <Loader size="small" style={{ marginLeft: '10px' }} />}
                  </div>
                )}
                {authPlan?.menu?.sms && (
                  <div
                    className={`send-option sms ${(sentWAMessageLoading || sentSmsLoading) ? 'disabled' : ''}`}
                    onClick={handleSMSMessageSend}
                  >
                    <Icon name="sms" color="#3B82F6" size={18} />
                    <span>SMS</span>
                    {sentSmsLoading && <Loader size="small" style={{ marginLeft: '10px' }} />}
                  </div>
                )}
              </div>
            )}


            <Button
              variant="empty"
              type="button"
              disabled={sentWAMessageLoading || sentSmsLoading}
              onClick={handleSmartSend}
            >
              {sentWAMessageLoading || sentSmsLoading ? (
                <Loader size="small" />
              ) : (
                <img src={agentpanel_send_icon} alt="Send" className="icon send-icon" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageInputBox;
