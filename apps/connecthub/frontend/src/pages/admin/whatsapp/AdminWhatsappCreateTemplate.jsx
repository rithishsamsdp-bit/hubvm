import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useWaTemplateStore } from "../../../store/admin/whatsapp/useWaTemplateStore.js";
import { Navbar, Radio } from "../../../components/Index.jsx";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CountryCodeDropdown from "../../../components/CountryCodeDropdown.jsx";
import EmojiPicker from "emoji-picker-react";
import { z } from "zod";
import phone from "../../../assets/background/Iphone.svg";
import {
  Loader2,
  Settings,
  MessageSquare,
  Image as ImageIcon,
  Video,
  FileText,
  Upload,
  X,
  Smile,
  Link as LinkIcon,
  Phone,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Validation Schema ──
const templateSchema = z.object({
  templateCategory: z.string().min(1, "Template category is required"),
  templateName: z
    .string()
    .min(1, "Template name is required")
    .regex(
      /^[a-z_]+$/,
      "Only lowercase letters and underscores allowed (a-z, _)",
    ),
  message: z.string().min(1, "Message is required"),
  footerText: z
    .string()
    .min(1, "Footer text is required")
    .refine((val) => !/\n/.test(val), "Newlines are not allowed")
    .refine(
      (val) => !/\p{Extended_Pictographic}/u.test(val),
      "Emojis are not allowed",
    ),
});

// ── Components ──
const SectionCard = ({ title, icon: IconComponent, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        <IconComponent className="w-4 h-4" />
      </div>
      <h3 className="font-bold text-slate-800">{title}</h3>
    </div>
    <div className="p-5 flex flex-col gap-6">{children}</div>
  </div>
);

const AdminWhatsappCreateTemplate = () => {
  const navigate = useNavigate();
  const { authRole } = useAuthStore();
  const { createTemplate, createTemplateLoading, checkTemplateNameExists } =
    useWaTemplateStore();

  const form = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      templateCategory: "Marketing",
      templateName: "",
      language: "en_US",
      headerType: "Text",
      mediaType: "image",
      headerTitle: "",
      message: "",
      footerText: "",
      buttonType: "none",
      ctaAction: "call",
      ctaButtonText: "",
      ctaUrl: "",
      ctaPhone: "",
      ctaButtons: [],
      quickReplies: [{ text: "" }],
    },
  });

  const { watch, setValue, trigger } = form;
  const formData = watch();

  const [errors, setErrors] = useState({});
  const [showEmoji, setShowEmoji] = useState(false);
  const [checkingTemplateName, setCheckingTemplateName] = useState(false);
  const debounceTimeoutRef = useRef(null);
  const msgInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Handlers ──
  const handleChange = (field, value) => {
    setValue(field, value, { shouldValidate: true });

    if (field === "templateName") {
      if (value.trim() && /^[a-z_]+$/.test(value)) {
        if (debounceTimeoutRef.current)
          clearTimeout(debounceTimeoutRef.current);
        setCheckingTemplateName(true);
        debounceTimeoutRef.current = setTimeout(async () => {
          const exists = await checkTemplateNameExists(value);
          if (exists) {
            form.setError("templateName", {
              message: "Template name already exists",
            });
          } else {
            form.clearErrors("templateName");
          }
          setCheckingTemplateName(false);
        }, 500);
      }
    }
  };

  const handleQuickReply = (index, value) => {
    const updated = formData.quickReplies.map((q, i) =>
      i === index ? { text: value } : q,
    );
    setValue("quickReplies", updated);
  };

  const addQuickReply = () =>
    setValue("quickReplies", [...formData.quickReplies, { text: "" }]);

  const removeQuickReply = (index) =>
    setValue(
      "quickReplies",
      formData.quickReplies.filter((_, i) => i !== index),
    );

  const resetButtons = () => {
    setValue("ctaAction", "call");
    setValue("ctaButtonText", "");
    setValue("ctaUrl", "");
    setValue("ctaPhone", "");
    setValue("ctaButtons", [
      {
        action: "call",
        text: "",
        url: "",
        phones: [{ code: "+91", number: "" }],
      },
    ]);
    setValue("quickReplies", [{ text: "" }]);
  };

  const addCTA = () => {
    if (formData.ctaButtons.length >= 2) return;
    setValue("ctaButtons", [
      ...(formData.ctaButtons || []),
      {
        action: "call",
        text: "",
        url: "",
        phones: [{ code: "+91", number: "" }],
      },
    ]);
  };

  const removeCTA = (index) => {
    setValue(
      "ctaButtons",
      formData.ctaButtons.filter((_, i) => i !== index),
    );
  };

  const handleCTAChange = (index, field, value) => {
    const updated = [...(formData.ctaButtons || [])];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: value };
      setValue("ctaButtons", updated);
    }
  };

  const handlePhoneChange = (ctaIndex, phoneIndex, field, value) => {
    const updated = [...(formData.ctaButtons || [])];
    if (updated[ctaIndex]) {
      const phones = [
        ...(updated[ctaIndex].phones || [{ code: "+91", number: "" }]),
      ];
      phones[phoneIndex] = {
        ...phones[phoneIndex],
        [field]:
          typeof value === "object" && value?.target
            ? value.target.value
            : value,
      };
      updated[ctaIndex] = { ...updated[ctaIndex], phones };
      setValue("ctaButtons", updated);
    }
  };

  const handleSubmit = async () => {
    const isValid = await trigger();
    let hasMediaError = false;

    if (formData.headerType === "Media" && !formData.mediaFile) {
      setErrors({ mediaFile: `Please upload a ${formData.mediaType}` });
      hasMediaError = true;
    } else {
      setErrors({});
    }

    if (!isValid || hasMediaError) return;

    await createTemplate(formData);
    const basePath = authRole === "TL" ? "/tl-whatsapp" : "/admin-whatsapp";
    navigate(`${basePath}?tab=Template&page=1&per_page=10`);
  };

  return (
    <div className="flex flex-col w-full h-full bg-slate-50 overflow-hidden">
      <Navbar
        title="Create Template"
        breadcrumbs={[
          {
            label: "Dashboard",
            route: authRole === "TL" ? "/tl-dashboard" : "/admin-dashboard",
          },
          {
            label: "WhatsApp",
            route: authRole === "TL" ? "/tl-whatsapp" : "/admin-whatsapp",
          },
          {
            label: "Template",
            route:
              authRole === "TL"
                ? "/tl-whatsapp?tab=Template"
                : "/admin-whatsapp?tab=Template",
          },
          { label: "Create Template", active: true },
        ]}
      >
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          disabled={createTemplateLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createTemplateLoading || checkingTemplateName}
        >
          {createTemplateLoading && (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          )}
          {createTemplateLoading ? "Submitting..." : "Submit Template"}
        </Button>
      </Navbar>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-6">
          {/* Left Form */}
          <Form {...form}>
            <div className="flex-1 flex flex-col gap-6">
              {/* Template Details */}
              <SectionCard title="Template Details" icon={Settings}>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="templateCategory"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1.5">
                        <FormLabel>Template Category</FormLabel>
                        <FormControl>
                          <Select
                            options={[
                              { label: "Marketing", value: "Marketing" },
                              { label: "Utility", value: "Utility" },
                            ]}
                            value={field.value}
                            onValueChange={(v) =>
                              handleChange("templateCategory", v)
                            }
                            placeholder="Select category"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="templateName"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1.5">
                        <FormLabel>
                          Template Name
                          {checkingTemplateName && (
                            <Loader2 className="w-3 h-3 ml-2 inline animate-spin" />
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) =>
                              handleChange("templateName", e.target.value)
                            }
                            placeholder="e.g. promotional_offer_01"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </SectionCard>

              {/* Content Details */}
              <SectionCard title="Content Details" icon={MessageSquare}>
                {/* Header */}
                <div className="flex flex-col gap-3 pb-6 border-b border-slate-100">
                  <div>
                    <Label>Header</Label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Add a title or choose which type of media you'll use for
                      this header.
                    </p>
                  </div>
                  <Radio
                    name="headerType"
                    direction="horizontal"
                    value={formData.headerType}
                    onChange={(val) => {
                      handleChange("headerType", val);
                      handleChange("headerTitle", "");
                    }}
                    options={[
                      { label: "Text", value: "Text" },
                      { label: "Media", value: "Media" },
                    ]}
                    className="mt-2"
                  />

                  {formData.headerType === "Media" && (
                    <div className="mt-4 flex flex-col gap-4">
                      <Label>Select Media Type</Label>
                      <div className="flex gap-4">
                        {[
                          { label: "Image", value: "image", icon: ImageIcon },
                          { label: "Video", value: "video", icon: Video },
                          {
                            label: "Document",
                            value: "document",
                            icon: FileText,
                          },
                        ].map((item) => {
                          const isActive = formData.mediaType === item.value;
                          return (
                            <div
                              key={item.value}
                              onClick={() =>
                                handleChange("mediaType", item.value)
                              }
                              className={cn(
                                "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all flex-1",
                                isActive
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white",
                              )}
                            >
                              <item.icon className="w-8 h-8" />
                              <span className="text-xs font-bold uppercase tracking-wide">
                                {item.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-2 flex flex-col gap-2">
                        <Label>Upload {formData.mediaType.toUpperCase()}</Label>
                        {!formData.mediaFile ? (
                          <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                            <input
                              type="file"
                              className="hidden"
                              accept={
                                formData.mediaType === "image"
                                  ? "image/*"
                                  : formData.mediaType === "video"
                                    ? "video/*"
                                    : ".pdf,.doc,.docx,.xls,.xlsx"
                              }
                              onChange={(e) => {
                                if (e.target.files[0])
                                  handleChange("mediaFile", e.target.files[0]);
                              }}
                            />
                            <Upload className="w-8 h-8 text-slate-400" />
                            <span className="text-sm font-medium text-slate-500">
                              Click or drag to upload
                            </span>
                          </label>
                        ) : (
                          <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white shadow-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                {formData.mediaType === "image" && (
                                  <ImageIcon className="w-5 h-5" />
                                )}
                                {formData.mediaType === "video" && (
                                  <Video className="w-5 h-5" />
                                )}
                                {formData.mediaType === "document" && (
                                  <FileText className="w-5 h-5" />
                                )}
                              </div>
                              <span className="text-sm font-medium text-slate-700 truncate">
                                {formData.mediaFile.name}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleChange("mediaFile", null)}
                              className="text-slate-400 hover:text-rose-500"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {errors.mediaFile && (
                          <p className="text-[11px] font-medium text-rose-500 mt-1.5">
                            {errors.mediaFile}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="flex flex-col gap-3 pb-6 border-b border-slate-100">
                  <div>
                    <Label>
                      Body <span className="text-rose-500">*</span>
                    </Label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enter the text for your message in the language you have
                      selected
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field: { ref: fieldRef, ...fieldRest } }) => (
                      <FormItem className="flex flex-col gap-2 relative">
                        <div className="relative border border-slate-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                          <FormControl>
                            <textarea
                              ref={(el) => {
                                fieldRef(el);
                                msgInputRef.current = el;
                              }}
                              className="w-full p-3 min-h-[120px] outline-none text-sm resize-none rounded-t-lg"
                              maxLength={1024}
                              placeholder="Enter text..."
                              {...fieldRest}
                              onChange={(e) =>
                                handleChange("message", e.target.value)
                              }
                            />
                          </FormControl>
                          <div className="flex items-center justify-between p-2 bg-slate-50 border-t border-slate-100 rounded-b-lg">
                            <div
                              className="flex items-center gap-2 relative"
                              ref={emojiPickerRef}
                            >
                              <button
                                type="button"
                                onClick={() => setShowEmoji(!showEmoji)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition-colors"
                              >
                                <Smile className="w-4 h-4" />
                              </button>
                              {showEmoji && (
                                <div className="absolute bottom-10 left-0 z-50 shadow-xl rounded-lg">
                                  <EmojiPicker
                                    onEmojiClick={(emojiData) => {
                                      const emoji = emojiData.emoji;
                                      const input = msgInputRef.current;
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
                                          input.selectionStart =
                                            input.selectionEnd =
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
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  const count =
                                    (
                                      formData.message.match(/\{\{\d+\}\}/g) ||
                                      []
                                    ).length + 1;
                                  const newVariable = `{{${count}}}`;
                                  const input = msgInputRef.current;
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
                                      input.selectionStart =
                                        input.selectionEnd =
                                          start + newVariable.length;
                                    }, 0);
                                  }
                                }}
                              >
                                + Add Variable
                              </Button>
                            </div>
                            <span className="text-xs font-medium text-slate-400">
                              {formData.message.length} / 1024
                            </span>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Footer */}
                <div className="flex flex-col gap-3 pb-6 border-b border-slate-100">
                  <div>
                    <Label>
                      Footer <span className="text-rose-500">*</span>
                    </Label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Add a short line of text to the bottom of your message
                      template.
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="footerText"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1.5">
                        <FormControl>
                          <Input
                            {...field}
                            maxLength={60}
                            onChange={(e) =>
                              handleChange("footerText", e.target.value)
                            }
                            placeholder="Enter footer text"
                          />
                        </FormControl>
                        <div className="flex justify-between items-start mt-1">
                          <FormMessage />
                          <span className="text-xs font-medium text-slate-400 ml-auto">
                            {formData.footerText.length} / 60
                          </span>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-3">
                  <div>
                    <Label>Buttons (Optional)</Label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Create up to 2 CTA or 5 QR buttons that let customers
                      respond.
                    </p>
                  </div>
                  <Radio
                    name="buttonType"
                    direction="horizontal"
                    value={formData.buttonType}
                    onChange={(val) => {
                      if (val !== formData.buttonType) {
                        handleChange("buttonType", val);
                        resetButtons();
                      }
                    }}
                    options={[
                      { label: "None", value: "none" },
                      { label: "Call to Action", value: "cta" },
                      { label: "Quick Reply", value: "quick" },
                    ]}
                    className="mt-2 mb-4"
                  />

                  {/* CTA Settings */}
                  {formData.buttonType === "cta" && (
                    <div className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      {formData.ctaButtons?.map((cta, index) => {
                        const usedActions = formData.ctaButtons
                          .map((b) => b.action)
                          .filter(Boolean);
                        const availableOptions = [
                          { label: "Visit Website (URL)", value: "url" },
                          { label: "Call Phone", value: "call" },
                        ].filter(
                          (opt) =>
                            !usedActions.includes(opt.value) ||
                            cta.action === opt.value,
                        );

                        return (
                          <div
                            key={index}
                            className="flex flex-col gap-3 p-3 bg-white border border-slate-200 rounded-md shadow-sm relative"
                          >
                            <div className="flex gap-3 items-end">
                              <div className="flex flex-col gap-1.5 flex-1 max-w-[200px]">
                                <Label>Type of Action</Label>
                                <Select
                                  options={availableOptions}
                                  value={cta.action}
                                  onValueChange={(v) =>
                                    handleCTAChange(index, "action", v)
                                  }
                                  placeholder="Select"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5 flex-1">
                                <Label>Button Text</Label>
                                <Input
                                  value={cta.text}
                                  onChange={(e) =>
                                    handleCTAChange(
                                      index,
                                      "text",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g. View Details"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeCTA(index)}
                                disabled={formData.ctaButtons.length === 1}
                                className="text-slate-400 hover:text-rose-500 shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            {cta.action === "url" && (
                              <div className="flex flex-col gap-1.5 mt-2">
                                <Label>Website URL</Label>
                                <Input
                                  value={cta.url}
                                  onChange={(e) =>
                                    handleCTAChange(
                                      index,
                                      "url",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="https://example.com"
                                />
                              </div>
                            )}

                            {cta.action === "call" && (
                              <div className="flex flex-col gap-1.5 mt-2">
                                <Label>Phone Number</Label>
                                <div className="flex h-10 rounded-md border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                                  <div className="w-[100px] border-r border-slate-200">
                                    <CountryCodeDropdown
                                      value={cta.phones?.[0]?.code || "+91"}
                                      onChange={(val) =>
                                        handlePhoneChange(index, 0, "code", val)
                                      }
                                      compact
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    className="flex-1 px-3 outline-none text-sm"
                                    placeholder="Enter number"
                                    value={cta.phones?.[0]?.number || ""}
                                    onChange={(e) =>
                                      handlePhoneChange(
                                        index,
                                        0,
                                        "number",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {formData.ctaButtons.length < 2 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addCTA}
                          className="self-start border-dashed"
                        >
                          + Add Another Action
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Quick Reply Settings */}
                  {formData.buttonType === "quick" && (
                    <div className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      {formData.quickReplies.map((q, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input
                            value={q.text}
                            onChange={(e) =>
                              handleQuickReply(i, e.target.value)
                            }
                            placeholder={`Quick reply ${i + 1}`}
                            className="bg-white"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeQuickReply(i)}
                            disabled={formData.quickReplies.length === 1}
                            className="text-slate-400 hover:text-rose-500 shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {formData.quickReplies.length < 5 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addQuickReply}
                          className="self-start border-dashed mt-1"
                        >
                          + Add Quick Reply
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          </Form>

          {/* Right Preview */}
          <div className="w-full lg:w-[260px] shrink-0 sticky top-6 self-start">
            <Label>Preview</Label>
            <div className="relative w-[240px] h-[488px] mx-auto select-none">
              <img
                src={phone}
                alt="Phone"
                className="w-full h-full pointer-events-none drop-shadow-xl"
              />

              <div className="absolute top-[75px] bottom-[68px] left-[16px] right-[16px] overflow-y-auto px-2 py-2 z-10 custom-scrollbar">
                <div className="bg-[#E2F7CB] p-3 rounded-lg shadow-sm font-sans text-[13px] leading-relaxed text-[#111B21] relative break-words">
                  {/* Small tail for WhatsApp bubble effect */}
                  <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-[#E2F7CB] border-l-[10px] border-l-transparent" />

                  {/* Media Header Preview */}
                  {formData.headerType === "Media" && (
                    <div className="w-full bg-slate-200 rounded mb-2 overflow-hidden flex items-center justify-center min-h-[120px]">
                      {formData.mediaFile ? (
                        formData.mediaType === "image" ? (
                          <img
                            src={URL.createObjectURL(formData.mediaFile)}
                            alt="Preview"
                            className="w-full h-auto"
                          />
                        ) : formData.mediaType === "video" ? (
                          <video
                            src={URL.createObjectURL(formData.mediaFile)}
                            className="w-full h-auto"
                          />
                        ) : (
                          <div className="flex flex-col items-center p-4 text-slate-500">
                            <FileText className="w-8 h-8 mb-2 text-rose-500" />
                            <span className="text-xs truncate max-w-[200px]">
                              {formData.mediaFile.name}
                            </span>
                          </div>
                        )
                      ) : (
                        <div className="text-slate-400 flex flex-col items-center">
                          {formData.mediaType === "image" && (
                            <ImageIcon className="w-8 h-8" />
                          )}
                          {formData.mediaType === "video" && (
                            <Video className="w-8 h-8" />
                          )}
                          {formData.mediaType === "document" && (
                            <FileText className="w-8 h-8" />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Text Header Preview */}
                  {formData.headerType === "Text" && formData.headerTitle && (
                    <p className="font-bold mb-1 break-words">
                      {formData.headerTitle}
                    </p>
                  )}

                  {/* Body Preview */}
                  <p className="whitespace-pre-wrap break-words">
                    {formData.message || "Your message..."}
                  </p>

                  {/* Footer Preview */}
                  {formData.footerText && (
                    <p className="text-[#667781] text-[11px] mt-1.5 uppercase tracking-wide break-words">
                      {formData.footerText}
                    </p>
                  )}

                  <div className="flex justify-end mt-1">
                    <span className="text-[10px] text-[#667781]">
                      {new Date().toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>
                </div>

                {/* Buttons Preview */}
                <div className="flex flex-col gap-1.5 mt-2">
                  {formData.buttonType === "cta" &&
                    formData.ctaButtons.map(
                      (b, i) =>
                        b.text.trim() && (
                          <div
                            key={i}
                            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white rounded-lg text-[#00A884] font-medium text-[13px] shadow-sm cursor-default"
                          >
                            {b.action === "url" ? (
                              <>
                                <LinkIcon className="w-3.5 h-3.5" /> {b.text}
                              </>
                            ) : b.action === "call" ? (
                              <>
                                <Phone className="w-3.5 h-3.5" /> {b.text}
                              </>
                            ) : (
                              b.text
                            )}
                          </div>
                        ),
                    )}

                  {formData.buttonType === "quick" &&
                    formData.quickReplies.map(
                      (q, i) =>
                        q.text.trim() && (
                          <div
                            key={i}
                            className="flex items-center justify-center py-2.5 px-4 bg-white rounded-lg text-[#00A884] font-medium text-[13px] shadow-sm cursor-default"
                          >
                            {q.text}
                          </div>
                        ),
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminWhatsappCreateTemplate;
