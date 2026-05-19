import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Paperclip,
  Smile,
  Send,
  X,
  FileText,
  PlusCircle,
  MessageCircle,
  MessageSquare
} from 'lucide-react';

// Using YOUR custom components for perfect compatibility
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
  const { authExtension, authUser, authPlan } = useAuthStore();
  const { sentWAMessage, sentWAMessageLoading, fetchWhatsappTemplates, sendManualTemplate } = useWhatsappStore();
  const { sendSMSMessage, sentSmsLoading } = useSmsStore();

  const [messageInput, setMessageInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showSendOptions, setShowSendOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateVariables, setTemplateVariables] = useState({});

  useEffect(() => {
    console.log("MessageInputBox: selectedTemplate changed:", selectedTemplate);
  }, [selectedTemplate]);

  const isLoading = sentWAMessageLoading || sentSmsLoading;
  const sendOptionsRef = useRef(null);

  // Close everything when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is inside a Radix portal (like the Select list)
      const isPortalClick = event.target.closest('[data-radix-portal]');

      if (sendOptionsRef.current && !sendOptionsRef.current.contains(event.target)) setShowSendOptions(false);
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && !isPortalClick) {
        setShowTemplateDropdown(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) setShowEmojiPicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Parse variables from selected template
  useEffect(() => {
    if (selectedTemplate?.templateText) {
      const regex = /{{(.*?)}}/g;
      const matches = [...selectedTemplate.templateText.matchAll(regex)];
      const variables = {};
      matches.forEach(match => { variables[match[1]] = ""; });
      setTemplateVariables(variables);
    } else {
      setTemplateVariables({});
    }
  }, [selectedTemplate]);

  const handleEmojiClick = useCallback((emojiData) => {
    const emoji = emojiData.unified ? String.fromCodePoint(...emojiData.unified.split('-').map(u => parseInt(u, 16))) : emojiData.emoji;
    setMessageInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  }, []);

  const handlewhatsappMessageSend = async () => {
    if (selectedTemplate) {
      console.log("SENDING TEMPLATE:", selectedTemplate.templateName);
      const agentExtension = String(authUser?.m_memberExtensionNo || authExtension || "");
      const phoneNumber = String(data.c_conversationPhoneNo || "");
      const variableKeys = Object.keys(templateVariables);

      // Improved mapping logic
      let variablesArray = [];
      const isNumeric = variableKeys.every(k => !isNaN(parseInt(k)));

      if (isNumeric && variableKeys.length > 0) {
        const maxIndex = Math.max(...variableKeys.map(k => parseInt(k)));
        variablesArray = Array.from({ length: maxIndex }, (_, i) => templateVariables[i + 1] || "");
      } else {
        variablesArray = variableKeys.sort().map(k => templateVariables[k] || "");
      }

      await sendManualTemplate(selectedTemplate.templateId, selectedTemplate.templateName, phoneNumber, agentExtension, variablesArray);
      setSelectedTemplate(null);
      setTemplateVariables({});
      return;
    }
    if (!messageInput && !selectedFile) return;
    const formData = new FormData();
    formData.append('dst', data.c_conversationPhoneNo);
    formData.append('agent', authExtension);
    formData.append('message', messageInput || '');
    if (selectedFile) {
      formData.append('file', selectedFile);
      formData.append('mediaType', selectedFile.type.split('/')[0] || 'file');
      formData.append('fileName', selectedFile.name);
    } else {
      formData.append('mediaType', 'text');
    }
    await sentWAMessage(formData, messageInput);
    setMessageInput('');
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSMSMessageSend = async () => {
    if (!messageInput) return;
    await sendSMSMessage(data, messageInput);
    setMessageInput('');
  };

  const handleSmartSend = () => {
    // If a template is selected, always send via WhatsApp
    if (selectedTemplate) {
      handlewhatsappMessageSend();
      return;
    }

    if (authPlan?.menu?.whatsapp && !authPlan?.menu?.sms) handlewhatsappMessageSend();
    else if (!authPlan?.menu?.whatsapp && authPlan?.menu?.sms) handleSMSMessageSend();
    else setShowSendOptions(!showSendOptions);
  };

  const handleTemplateDropdownToggle = async () => {
    if (!showTemplateDropdown) {
      setTemplatesLoading(true);
      setShowTemplateDropdown(true);
      const fetched = await fetchWhatsappTemplates();
      setTemplates(fetched);
      setTemplatesLoading(false);
    } else {
      setShowTemplateDropdown(false);
    }
  };

  if (!authPlan?.menu?.whatsapp && !authPlan?.menu?.sms) return null;

  return (
    <div className="flex flex-col bg-white border-t border-slate-200 shrink-0 relative z-40">

      {/* ---------- Template Preview Card (SIMPLE DESIGN) ---------- */}
      {selectedTemplate && (
        <div className="absolute bottom-full left-4 mb-2 z-[9999] w-[calc(100%-32px)] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 leading-none">{selectedTemplate.templateName}</h3>
                  <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest font-bold">WhatsApp Template</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-3.5 overflow-y-auto max-h-[40vh] bg-white">
              <div className="bg-slate-50/80 rounded-lg p-4 border border-slate-100 text-[12.5px] text-slate-700 leading-relaxed whitespace-pre-wrap shadow-inner">
                {(() => {
                  const text = selectedTemplate.templateText || "";
                  if (!text) return <span className="italic text-slate-400">No content available for this template</span>;
                  const parts = text.split(/({{.*?}})/g);
                  return parts.map((part, index) => {
                    const match = part.match(/{{(.*?)}}/);
                    if (match) {
                      const varName = match[1];
                      return (
                        <span key={index} className="inline-block mx-0.5 group">
                          <input
                            type="text"
                            placeholder={`Variable ${varName}`}
                            className="px-2 py-0.5 w-[100px] text-[11px] bg-white border border-primary/20 text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 font-medium shadow-sm placeholder:text-slate-300 transition-all"
                            value={templateVariables[varName] || ''}
                            onChange={(e) => setTemplateVariables(p => ({ ...p, [varName]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && handlewhatsappMessageSend()}
                          />
                        </span>
                      );
                    }
                    return <span key={index}>{part}</span>;
                  });
                })()}
              </div>
              {Object.keys(templateVariables).length > 0 && (
                <p className="mt-2.5 text-[10px] text-slate-400 text-center font-medium italic">
                  Fill the fields above and click the Send button below.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------- File Preview ---------- */}
      {selectedFile && (
        <div className="p-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm max-w-[280px] relative">
            {previewUrl ? <img src={previewUrl} className="w-12 h-12 rounded object-cover" /> : <div className="w-12 h-12 bg-blue-50 flex items-center justify-center text-blue-500 rounded"><Paperclip className="w-5 h-5" /></div>}
            <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-700 truncate">{selectedFile.name}</p><p className="text-[10px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p></div>
            <button className="text-slate-400 hover:text-red-500" onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ---------- Main Input Bar ---------- */}
      <div className="flex items-end gap-3 p-4">
        <div className="flex-1 flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <textarea
            ref={inputRef}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none resize-none outline-none py-1 text-sm text-slate-800 min-h-[24px] max-h-[120px]"
            rows={1}
            value={messageInput}
            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSmartSend(); } }}
          />

          <div className="flex items-center gap-1 pb-0.5">
            <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full" onClick={() => fileInputRef.current?.click()}><Paperclip className="w-5 h-5" /></button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

            <div className="relative" ref={emojiPickerRef}>
              <button className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-full" onClick={() => setShowEmojiPicker(!showEmojiPicker)}><Smile className="w-5 h-5" /></button>
              {showEmojiPicker && <div className="absolute bottom-full right-0 mb-4 shadow-2xl rounded-xl overflow-hidden border border-slate-200 z-50"><EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={400} skinTonesDisabled /></div>}
            </div>

            <div className="relative" ref={dropdownRef}>
              <button className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full" onClick={handleTemplateDropdownToggle}><PlusCircle className="w-5 h-5" /></button>
              {showTemplateDropdown && (
                <div className="absolute bottom-full right-0 mb-4 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-400 uppercase tracking-widest"><FileText className="w-3 h-3" /> Select Template</div>
                  {templatesLoading ? <div className="flex items-center justify-center p-4"><Loader size="small" /></div> : (
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Choose a template</label>
                      {templates.length === 0 ? (
                        <div className="text-xs text-slate-400 py-2 italic text-center">No templates found</div>
                      ) : (
                      <Select
                        options={templates.map(t => ({
                          label: t.templateName || "Unnamed Template",
                          value: String(t.templateId || t.templateName)
                        }))}
                        placeholder="-- Click to select --"
                        onChange={(val) => {
                          console.log("Template selected value:", val);
                          if (!val) return;
                          const t = templates.find(temp => 
                            String(temp.templateId) === String(val) || 
                            String(temp.templateName) === String(val)
                          );
                          if (t) {
                            console.log("Found template object:", t);
                            setSelectedTemplate(t);
                            setShowTemplateDropdown(false);
                          } else {
                            console.error("Could not find template for value:", val);
                          }
                        }}
                        width="100%"
                      />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative flex items-end" ref={sendOptionsRef}>
          {showSendOptions && (
            <div className="absolute bottom-full right-0 mb-4 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden min-w-[150px] z-50">
              {authPlan?.menu?.whatsapp && <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-emerald-50 text-slate-700" onClick={handlewhatsappMessageSend}><MessageCircle className="w-4 h-4 text-emerald-500" /> WhatsApp</button>}
              {authPlan?.menu?.sms && <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-blue-50 text-slate-700 border-t border-slate-100" onClick={handleSMSMessageSend}><MessageSquare className="w-4 h-4 text-blue-500" /> SMS</button>}
            </div>
          )}
          <button
            className={`w-12 h-12 rounded-full p-0 flex items-center justify-center transition-all duration-300 shadow-lg ${isLoading
                ? 'bg-slate-100 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95'
              }`}
            disabled={isLoading}
            onClick={handleSmartSend}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <Send className="w-5 h-5 text-white -rotate-12 translate-x-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageInputBox;

