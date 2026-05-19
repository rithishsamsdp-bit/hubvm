import React, { useMemo, useState, Activity, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/AdminWhatsappCreateTemplate.css";
import "../../agent/conversation/styles/ConversationMessageContainer.css";
import Icon from "../../../constants/Icon.jsx";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { Input, Select, FormInputError, Button, Radio, Loader } from "../../../components/Index.jsx";
import phone from "../../../assets/background/Iphone.svg";
import EmojiPicker from "emoji-picker-react";
import CountryCodeDropdown from "../../../components/CountryCodeDropdown.jsx";
import { useWaTemplateStore } from "../../../store/admin/whatsapp/useWaTemplateStore.js";

const AdminWhatsappCreateTemplate = () => {
  const navigate = useNavigate();
  const { authRole } = useAuthStore();
  const { createTemplate, createTemplateLoading, checkTemplateNameExists } = useWaTemplateStore();
  // ── Unified state
  const [formData, setFormData] = useState({
    templateCategory: "Marketing",
    templateName: "",
    language: "en_US",
    headerType: "Text",
    mediaType: "",
    headerTitle: "",
    message: "",
    footerText: "",
    buttonType: "none",
    ctaAction: "call",
    ctaButtonText: "",
    ctaUrl: "",
    ctaPhone: "",
    ctaButtons: [],
    quickReplies: [{ text: "" }]
  });

  const [errors, setErrors] = useState({});
  const [showEmoji, setShowEmoji] = useState(false);
  const [checkingTemplateName, setCheckingTemplateName] = useState(false);
  const debounceTimeoutRef = useRef(null);

  // ── Handlers
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Real-time validation for templateName
    if (field === "templateName") {
      if (!value.trim()) {
        setErrors((prev) => ({ ...prev, [field]: "Template name is required" }));
      } else if (!/^[a-z_]+$/.test(value)) {
        setErrors((prev) => ({
          ...prev,
          [field]: "Only lowercase letters and underscores allowed (a-z, _)",
        }));
      } else {
        setErrors((prev) => ({ ...prev, [field]: undefined }));

        // Debounced check for existing template name
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        setCheckingTemplateName(true);
        debounceTimeoutRef.current = setTimeout(async () => {
          const exists = await checkTemplateNameExists(value);
          if (exists) {
            setErrors((prev) => ({
              ...prev,
              templateName: "Template name already exists",
            }));
          }
          setCheckingTemplateName(false);
        }, 500);
      }
    } else if (field === "footerText") {
      if (!value.trim()) {
        setErrors((prev) => ({ ...prev, [field]: "Footer text is required" }));
      } else if (/\n/.test(value)) {
        setErrors((prev) => ({ ...prev, [field]: "Newlines are not allowed" }));
      } else if (/\p{Extended_Pictographic}/u.test(value)) {
        setErrors((prev) => ({ ...prev, [field]: "Emojis are not allowed" }));
      } else {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    } else {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };


  const handleQuickReply = (index, value) => {
    const updated = formData.quickReplies.map((q, i) =>
      i === index ? { text: value } : q
    );
    setFormData((prev) => ({ ...prev, quickReplies: updated }));
    setErrors((e) => ({ ...e, quickReplies: undefined }));
  };

  const addQuickReply = () =>
    setFormData((prev) => ({
      ...prev,
      quickReplies: [...prev.quickReplies, { text: "" }],
    }));

  const removeQuickReply = (index) =>
    setFormData((prev) => ({
      ...prev,
      quickReplies: prev.quickReplies.filter((_, i) => i !== index),
    }));

  const resetButtons = () => {
    setFormData((prev) => ({
      ...prev,
      ctaAction: "call",
      ctaButtonText: "",
      ctaUrl: "",
      ctaPhone: "",
      ctaButtons: [
        {
          action: "call",
          text: "",
          url: "",
          phones: [{ code: "+91", number: "" }],
        },
      ],


      quickReplies: [{ text: "" }],
    }));
  };

  // ── Validators
  const validate = () => {
    const e = {};
    const f = formData;

    // Required: Template Category & Name
    if (!f.templateCategory?.trim()) e.templateCategory = "Template category is required";
    if (!f.templateName?.trim()) {
      e.templateName = "Template name is required";
    } else if (!/^[a-z_]+$/.test(f.templateName)) {
      e.templateName =
        "Template name can only contain lowercase letters and underscores (a-z, _)";
    }

    // Header validation
    if (f.headerType === "Media" && !f.mediaFile)
      e.mediaFile = `Please upload a ${f.mediaType}`;

    // Footer validation
    if (!f.footerText.trim()) {
      e.footerText = "Footer text is required";
    } else if (/\n/.test(f.footerText)) {
      e.footerText = "Newlines are not allowed in footer text";
    } else if (/\p{Extended_Pictographic}/u.test(f.footerText)) {
      e.footerText = "Emojis are not allowed in footer text";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ---- CTA SET HANDLERS ----
  const addCTA = () => {
    if (formData.ctaButtons.length >= 2) return;
    setFormData((prev) => ({
      ...prev,
      ctaButtons: [
        ...(prev.ctaButtons || []),
        { action: "", text: "", url: "", phones: [{ code: "+91", number: "" }] },
      ],
    }));
  };

  const removeCTA = (index) => {
    setFormData((prev) => ({
      ...prev,
      ctaButtons: prev.ctaButtons.filter((_, i) => i !== index),
    }));
  };

  const handleCTAChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.ctaButtons];
      updated[index][field] = value;
      return { ...prev, ctaButtons: updated };
    });
  };

  // ---- PHONE HANDLERS (within CTA set) ----
  const handlePhoneChange = (ctaIndex, phoneIndex, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.ctaButtons];
      const phones = [...(updated[ctaIndex].phones || [{ code: "+91", number: "" }])];

      phones[phoneIndex] = {
        code: phones[phoneIndex]?.code || "+91",
        number: phones[phoneIndex]?.number || "",
        [field]: typeof value === "object" && value?.target ? value.target.value : value,
      };

      updated[ctaIndex].phones = phones;
      return { ...prev, ctaButtons: updated };
    });
  };

  const removePhone = (ctaIndex, phoneIndex) => {
    setFormData((prev) => {
      const updated = [...prev.ctaButtons];
      updated[ctaIndex].phones.splice(phoneIndex, 1);
      return { ...prev, ctaButtons: updated };
    });
  };

  // ── Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      // console.warn("❌ Validation failed:", errors);
      return;
    }
    await createTemplate(formData);
    navigate("/admin-whatsapp?tab=Template&page=1&per_page=10");
  };

  // ── UI
  return (
    <div className="WhatsappCreateTemplate">
      <div className="navbar_1">
        <div>
          <p className="navbar_1_heading">Create Template</p>
          <span className="navbar_1_breadcrumb">
            <span
              className="navbar_1_breadcrumb_item"
              onClick={() => {
                if (authRole === "TL") navigate("/tl-dashboard");
                else if (authRole === "ADMIN") navigate("/admin-dashboard");
              }}
            >
              Dashboard
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span
              className="navbar_1_breadcrumb_item"
              onClick={() => navigate("/admin-whatsapp")}
            >
              Whatsapp
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span
              className="navbar_1_breadcrumb_item"
              onClick={() => navigate("/admin-whatsapp?tab=Template")}
            >
              Template
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span className="navbar_1_breadcrumb_item active">
              Create Template
            </span>
          </span>
        </div>
      </div>

      <Activity mode={createTemplateLoading ? "visible" : "hidden"}>
        <div className="admin_WA_loader_container">
          <Loader />
        </div>
      </Activity>
      <Activity mode={createTemplateLoading ? "hidden" : "visible"}>
        <form className="wct__layout" onSubmit={handleSubmit}>
          <div className="wct__form">
            {/* Template Details */}
            <div className="wct__card">
              <div className="wct__card-title">Template Details</div>
              <div className="wct__row" style={{ alignItems: 'normal' }}>
                <div className="wct__field">
                  <label>Template Category</label>
                  <Select
                    allowClear
                    showSearch={false}
                    placeholder="Select"
                    value={formData.templateCategory}
                    options={[
                      { label: "Marketing", value: "Marketing" },
                      { label: "Utility", value: "Utility" }
                    ]}
                    onChange={(v) => handleChange("templateCategory", v || "")}
                  />
                  {errors.templateCategory && (
                    <FormInputError message={errors.templateCategory} />
                  )}
                </div>
                <div className="wct__field">
                  <label>Template Name</label>
                  <Input
                    value={formData.templateName}
                    onChange={(e) => handleChange("templateName", e.target.value)}
                    placeholder="Enter template name"
                  />
                  {errors.templateName && (
                    <FormInputError message={errors.templateName} />
                  )}
                </div>

              </div>
            </div>

            {/* Content Details */}
            <div className="wct__card">
              <div className="wct__card-title">Content Details</div>

              {/* Header */}
              <div className="wct__block">
                <div className="wct__block-head">Header</div>
                <p className="wct_field_p">Add a title or choose which type of media you'll use for this header.</p>
                <div className="wct__field">
                  <label>Type</label>
                  <Radio
                    name="headerType"
                    direction="horizontal"
                    value={formData.headerType}
                    onChange={(val) =>
                      handleChange("headerType", val) || handleChange("headerTitle", "")
                    }
                    options={[
                      { label: "Text", value: "Text" },
                      { label: "Media", value: "Media" },
                    ]}
                  />
                </div>



                {formData.headerType === "Media" && (
                  <div className="wct__field" style={{ marginTop: "20px" }}>
                    <label>Select Media Type</label>
                    <div className="media-type-options">
                      {[
                        { label: "IMAGE", value: "image", icon: "image" },
                        { label: "VIDEO", value: "video", icon: "video" },
                        { label: "DOCUMENT", value: "document", icon: "document" },
                      ].map((item) => (
                        <div
                          key={item.value}
                          className={`media-card ${formData.mediaType === item.value ? "active" : ""
                            }`}
                          onClick={() => handleChange("mediaType", item.value)}
                        >
                          <div className="media-card-header">
                            <input
                              type="radio"
                              name="mediaType"
                              checked={formData.mediaType === item.value}
                              onChange={() => handleChange("mediaType", item.value)}
                            />
                            <span>{item.label}</span>
                          </div>
                          <div className="media-card-body">
                            {item.icon === "image" && <Icon name="image" size={32} color="#ff5200" />}
                            {item.icon === "video" && <Icon name="video" size={32} color="#ff5200" />}
                            {item.icon === "document" && <Icon name="docs" size={32} color="#ff5200" />}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ── File Upload Section ── */}
                    <div className="wct__field upload-field" style={{ marginTop: "15px" }}>
                      <label>Upload {formData.mediaType.toUpperCase()}</label>

                      {!formData.mediaFile ? (
                        <label className="upload-box">
                          <input
                            type="file"
                            accept={
                              formData.mediaType === "image"
                                ? "image/*"
                                : formData.mediaType === "video"
                                  ? "video/*"
                                  : ".pdf,.doc,.docx,.xls,.xlsx"
                            }
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) handleChange("mediaFile", file);
                            }}
                          />
                          <div className="upload-placeholder">
                            <Icon name="upload" size={28} color="#000" />
                            <span>Click or drag to upload {formData.mediaType}</span>
                          </div>
                        </label>
                      ) : (
                        <div className="uploaded-file-preview">
                          <div className="file-info">
                            <Icon name="file" size={22} color="#000" />
                            <span>{formData.mediaFile.name}</span>
                          </div>
                          <Button
                            type="button"
                            className="remove-btn"
                            onClick={() => handleChange("mediaFile", null)}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                      {errors.mediaFile && <FormInputError message={errors.mediaFile} />}
                    </div>
                  </div>
                )}

              </div>

              {/* Body */}
              <div className="wct__block">
                <div className="wct__block-head">Body (Mandatory)</div>
                <p className="wct_field_p">Enter the text for your message in the language you have selected</p>
                <div className="wct__field">
                  <label>Message</label>
                  <div className="message-box">
                    <textarea
                      ref={(ref) => (window.msgInputRef = ref)}
                      className="message-input"
                      rows={5}
                      maxLength={1024}
                      placeholder="Enter text in en"
                      value={formData.message}
                      onChange={(e) => handleChange("message", e.target.value)}
                    />
                    <span className="message-counter">
                      {formData.message.length} / 1024
                    </span>
                  </div>

                  <div className="message-toolbar">
                    <div className="emoji-wrapper">
                      <button
                        type="button"
                        className="emoji-btn"
                        onClick={() => setShowEmoji((prev) => !prev)}
                      >
                        😊
                      </button>
                      {showEmoji && (
                        <div className="emoji-picker-popup">
                          <EmojiPicker
                            onEmojiClick={(emojiData) => {
                              const emoji = emojiData.emoji;
                              const input = window.msgInputRef;
                              if (input) {
                                const start = input.selectionStart;
                                const end = input.selectionEnd;
                                const newText =
                                  formData.message.substring(0, start) +
                                  emoji +
                                  formData.message.substring(end);
                                handleChange("message", newText);
                                setTimeout(() => {
                                  input.focus();
                                  input.selectionStart = input.selectionEnd =
                                    start + emoji.length;
                                }, 0);
                              }
                            }}
                            width={280}
                            height={350}
                            theme="light"
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      className="variable-btn"
                      onClick={() => {
                        const count =
                          (formData.message.match(/\{\{\d+\}\}/g) || []).length + 1;
                        const newVariable = `{{${count}}}`;
                        const input = window.msgInputRef;
                        if (input) {
                          const start = input.selectionStart;
                          const end = input.selectionEnd;
                          const newText =
                            formData.message.substring(0, start) +
                            newVariable +
                            formData.message.substring(end);
                          handleChange("message", newText);
                          setTimeout(() => {
                            input.focus();
                            input.selectionStart = input.selectionEnd =
                              start + newVariable.length;
                          }, 0);
                        }
                      }}
                    >
                      + ADD VARIABLE
                    </Button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="wct__block">
                <div className="wct__block-head">Footer (Mandatory)</div>
                <p className="wct_field_p">Add a short line of text to the bottom of your message template.</p>
                <div className="wct__field">
                  <label>Footer Text</label>
                  <Input
                    value={formData.footerText}
                    maxLength={60}
                    onChange={(e) => handleChange("footerText", e.target.value)}
                    placeholder="Enter footer text"
                  />
                  <label>{formData.footerText.length} / 60</label>
                  {errors.footerText && <FormInputError message={errors.footerText} />}
                </div>
              </div>

              {/* Buttons */}
              <div className="wct__block" style={{ display: "grid", gap: "10px" }}>
                <div className="wct__block-head" style={{ marginBottom: '0' }}>Buttons (Optional)</div>
                <p className="wct_field_p">Create up to 2 CTA or 3 QR buttons that let customers respond to your messages or take action.</p>
                <div className="wct__field">
                  <label>Type</label>
                  <Radio
                    name="buttonType"
                    direction="horizontal"
                    value={formData.buttonType}
                    onChange={(val) => {
                      handleChange("buttonType", val);
                      resetButtons();
                    }}
                    options={[
                      { label: "None", value: "none" },
                      { label: "Call to Action", value: "cta" },
                      { label: "Quick Reply", value: "quick" },
                    ]}
                  />
                </div>

                {/* CALL TO ACTION SECTION */}
                {formData.buttonType === "cta" && (
                  <>
                    <div className="cta-list">
                      {formData.ctaButtons?.map((cta, index) => {
                        // Find what actions are already used
                        const usedActions = formData.ctaButtons.map((b) => b.action).filter(Boolean);

                        // Filter available options dynamically
                        const availableOptions = [
                          { label: "Visit Website (URL)", value: "url" },
                          { label: "Call Phone", value: "call" },
                        ].filter((opt) => !usedActions.includes(opt.value) || cta.action === opt.value);

                        return (
                          <div key={index} className="cta-set">
                            <div className="wct__row">
                              <div className="wct__field" style={{ maxWidth: 260 }}>
                                <label>Type of Action</label>
                                <Select
                                  allowClear
                                  placeholder="Select"
                                  value={cta.action}
                                  options={availableOptions}
                                  onChange={(v) => handleCTAChange(index, "action", v || "")}
                                />
                              </div>

                              <div className="wct__field grow">
                                <label>Button Text</label>
                                <Input
                                  value={cta.text}
                                  onChange={(e) =>
                                    handleCTAChange(index, "text", e.target.value)
                                  }
                                  placeholder="e.g., View Details / Call Now"
                                />
                              </div>

                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => removeCTA(index)}
                                disabled={formData.ctaButtons.length === 1}
                              >
                                Remove
                              </Button>
                            </div>

                            {/* Extra Inputs Based on Type */}
                            {cta.action === "url" && (
                              <div className="wct__row">
                                <div className="wct__field grow">
                                  <label>Website URL</label>
                                  <Input
                                    value={cta.url}
                                    onChange={(e) =>
                                      handleCTAChange(index, "url", e.target.value)
                                    }
                                    placeholder="https://example.com"
                                  />
                                </div>
                              </div>
                            )}

                            {cta.action === "call" && (
                              <div className="wct__row">
                                <div className="wct__field" style={{ width: "100%" }}>
                                  <label>Phone Number</label>
                                  <div className="combined-phone-input">
                                    <div className="country-code-section">
                                      <CountryCodeDropdown
                                        value={cta.phones?.[0]?.code}
                                        onChange={(value) => handlePhoneChange(index, 0, "code", value)}
                                        placeholder="Select"
                                        compact={true}
                                      />
                                    </div>
                                    <div className="phone-number-section">
                                      <input
                                        className="phone-number-input"
                                        placeholder="Enter phone number"
                                        value={cta.phones?.[0]?.number || ""}
                                        onChange={(e) =>
                                          handlePhoneChange(index, 0, "number", e.target.value)
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* ADD MORE CTA SET */}
                      {formData.ctaButtons.length < 2 && (
                        <Button type="button" onClick={addCTA} >
                          + Add More
                        </Button>
                      )}
                    </div>
                  </>
                )}


                {/* Quick Replies */}
                {formData.buttonType === "quick" && (
                  <div className="wct__quick">
                    {formData.quickReplies.map((q, i) => (
                      <div className="wct__row" key={i}>
                        <div className="wct__field grow">
                          <label>Button Text</label>
                          <Input
                            value={q.text}
                            onChange={(e) => handleQuickReply(i, e.target.value)}
                            placeholder={`Quick reply ${i + 1}`}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => removeQuickReply(i)}
                          disabled={formData.quickReplies.length === 1}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}

                    {/* Hide Add More if already 3 */}
                    {formData.quickReplies.length < 3 && (
                      <Button type="button" onClick={addQuickReply}>
                        + Add More
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="wct__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/admin-whatsapp?tab=Template")}
              >
                Cancel
              </Button>
              <Button type="submit" onClick={handleSubmit}>
                Submit
              </Button>
            </div>
          </div>
          {/* RIGHT: Preview */}
          <aside className="wct__preview">
            <div className="wct__phone-container">
              <img src={phone} alt="Phone Frame" className="wct__phone-img" />

              <div className="wct__chat-content">
                <div className="conversation_message_card">
                  {formData.headerType === "Media" && (
                    <div className="wct__bubble-media">
                      {formData.mediaFile ? (
                        formData.mediaType === "image" ? (
                          <img
                            src={URL.createObjectURL(formData.mediaFile)}
                            alt="Uploaded"
                            className="wct__media-preview"
                          />
                        ) : formData.mediaType === "video" ? (
                          <video
                            src={URL.createObjectURL(formData.mediaFile)}
                            controls
                            className="wct__media-preview"
                          />
                        ) : (
                          <div className="doc-preview">
                            <Icon name="docs" size={40} color="#9ca3af" />
                            <p>{formData.mediaFile.name}</p>
                          </div>
                        )
                      ) : (
                        // Default icon before upload
                        <>
                          {formData.mediaType === "image" && <Icon name="image" size={72} color="#9ca3af" />}
                          {formData.mediaType === "video" && <Icon name="video" size={72} color="#9ca3af" />}
                          {formData.mediaType === "document" && <Icon name="docs" size={72} color="#9ca3af" />}
                        </>
                      )}
                    </div>
                  )}

                  <div className="wa-template-message">
                    {formData.headerType === "Text" && formData.headerTitle && (
                      <p className="wa-template-header">{formData.headerTitle}</p>
                    )}
                    <p className="wa-template-body">
                      {formData.message || "Your message..."}
                    </p>
                    {formData.footerText && (
                      <p className="wa-template-footer">{formData.footerText}</p>
                    )}

                    {/* --- CTA Buttons Preview --- */}
                    {formData.buttonType === "cta" &&
                      formData.ctaButtons.some((b) => b.text.trim()) && (
                        <div className="wa-template-buttons">
                          {formData.ctaButtons
                            .filter((b) => b.text.trim() !== "")
                            .map((b, i) => (
                              <span key={i} className="wa-template-btn">
                                {b.text}
                              </span>
                            ))}
                        </div>
                      )}

                    {/* --- QUICK REPLY BUTTON PREVIEW --- */}
                    {formData.buttonType === "quick" &&
                      formData.quickReplies.some((q) => q.text.trim()) && (
                        <div className="wa-template-buttons">
                          {formData.quickReplies
                            .filter((q) => q.text.trim() !== "")
                            .map((q, i) => (
                              <span key={i} className="wa-template-btn">
                                {q.text}
                              </span>
                            ))}
                        </div>
                      )}
                  </div>
                </div>
              </div>


            </div>
          </aside>
        </form>
      </Activity>

    </div>
  );
};

export default AdminWhatsappCreateTemplate;
