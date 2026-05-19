import React, { useMemo, useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useWaTemplateStore } from "../../../store/admin/whatsapp/useWaTemplateStore.js";
import { useWhatsappStore } from "../../../store/admin/whatsapp/useWhatsappStore.js";
import { 
  DateTimeRangePicker, 
  Navbar, 
  FormInputError,
  Loader 
} from "../../../components/Index.jsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/table";
import { toast } from "../../../store/useToastStore.js";
import GroupsDropdown from "./components/GroupsDropdown.jsx";
import { z } from "zod";
import { cn } from "@/lib/utils";
import phone from "../../../assets/background/Iphone.svg";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Loader2,
  Puzzle,
  Wrench,
  Upload,
  Link as LinkIcon,
  Phone,
  Eye,
  ChevronLeft,
  ChevronRight,
  Info,
  AlertTriangle,
  FileText,
  Settings,
  Users,
} from "lucide-react";

const CATEGORY_META = {
  marketing: {
    title: "Marketing",
    desc: "Campaigns in this category are used to send promotions or information about your products, services or business",
    icon: Puzzle,
  },
  utility: {
    title: "Utility",
    desc: "Use it to make changes directly on data tables, e.g. Product Price Factor",
    icon: Wrench,
  },
};

const campaignSchema = z.object({
  campaignName: z.string().min(1, "Enter a campaign name"),
  campaignCategory: z.string().min(1, "Choose a category"),
  templateId: z.string().optional(),
  audienceSource: z.string().default("file"),
  selectedGroupId: z.string().optional(),
  scheduleTime: z.any().optional(),
});

const SectionCard = ({ title, icon: IconComponent, children, hint }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
      {IconComponent && (
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <IconComponent className="w-4 h-4" />
        </div>
      )}
      <div className="flex flex-col">
        <h3 className="font-bold text-slate-800">{title}</h3>
        {hint && <p className="text-[10px] text-slate-500 font-medium">{hint}</p>}
      </div>
    </div>
    <div className="p-5 flex flex-col gap-6">{children}</div>
  </div>
);

const AdminWhatsappCreateCampaign = () => {
  const navigate = useNavigate();
  const { authRole } = useAuthStore();
  const {
    createCampaign,
    createCampaignLoading,
    getGroupContacts,
    groupContacts,
    getGroupContactsLoading,
  } = useWhatsappStore();

  const form = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      campaignName: "",
      campaignCategory: "",
      templateId: "",
      audienceSource: "file",
      selectedGroupId: "",
      scheduleTime: null,
    },
  });

  const { watch, setValue, trigger } = form;
  const formData = watch();
  const [step, setStep] = useState("details");

  useEffect(() => {
    if (formData.audienceSource === "group" && formData.selectedGroupId) {
      getGroupContacts(formData.selectedGroupId);
    }
  }, [formData.audienceSource, formData.selectedGroupId, getGroupContacts]);

  const handleChange = (field, value) => {
    if (field === "campaignCategory") {
      const hasTemplates = rawTemplates?.some(
        (t) =>
          t.templateCategory &&
          t.templateCategory.toLowerCase() === value.toLowerCase(),
      );
      if (!hasTemplates) {
        toast.error(`No template found for ${value} category`);
        return;
      }
    }
    setValue(field, value, { shouldValidate: true });
  };

  const handleSubmitStep1 = async (e) => {
    e?.preventDefault();
    const isValid = await trigger(["campaignName", "campaignCategory"]);
    if (isValid) {
      setStep("dev");
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    }
  };

  const titleFromKey = (k) => CATEGORY_META[k]?.title || k;

  // --- Templates ---
  const { templates: rawTemplates, getTemplates } = useWaTemplateStore();

  useEffect(() => {
    getTemplates(50, 0, "", "", "");
  }, []);

  const templates = useMemo(() => {
    if (!rawTemplates || !Array.isArray(rawTemplates)) return [];
    const filtered = rawTemplates.filter((t) => {
      if (!formData.campaignCategory) return true;
      return (
        t.templateCategory &&
        t.templateCategory.toLowerCase() ===
          formData.campaignCategory.toLowerCase()
      );
    });

    return filtered.map((t) => {
      const struct = t.templateStructure || {};
      const components = struct.components || [];
      const bodyComp = components.find((c) => c.type === "BODY");
      const btnsComp = components.find((c) => c.type === "BUTTONS");

      let actionLabel = "View";
      let actionType = "default";
      if (btnsComp && btnsComp.buttons?.length > 0) {
        const btn = btnsComp.buttons[0];
        actionLabel = btn.text || "Button";
        if (btn.type === "phone_number") actionType = "call";
        else if (btn.type === "url") actionType = "link";
        else actionType = "reply";
      }

      const allText = components
        .filter((c) => ["BODY", "HEADER"].includes(c.type))
        .map((c) => c.text || "")
        .join(" ");
      const hasVariables = /{{(\d+)}}/.test(allText);

      return {
        id: t._id || t.templateName,
        name: t.templateName,
        desc: bodyComp?.text || "No content",
        action: actionLabel,
        actionType,
        hasVariables,
        original: t,
      };
    });
  }, [rawTemplates, formData.campaignCategory]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === formData.templateId),
    [formData.templateId, templates],
  );

  const carouselRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const el = carouselRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    const tId = setTimeout(updateArrows, 500);
    window.addEventListener("resize", updateArrows);
    return () => {
      clearTimeout(tId);
      window.removeEventListener("resize", updateArrows);
    };
  }, [templates, step]);

  const scrollByCards = (dir = "right", cards = 1) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({
      left: (dir === "left" ? -1 : 1) * 260 * cards,
      behavior: "smooth",
    });
    setTimeout(updateArrows, 300);
  };

  // --- Audience ---
  const [audienceRows, setAudienceRows] = useState([]);
  const [duplicateRows, setDuplicateRows] = useState([]);
  const [dynamicHeaders, setDynamicHeaders] = useState([]);
  const [duplicateRemovalStatus, setDuplicateRemovalStatus] = useState("No");
  const [rawFile, setRawFile] = useState(null);
  const [viewDup, setViewDup] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const fileInputRef = useRef(null);

  const [audPage, setAudPage] = useState(1);
  const [audPageSize, setAudPageSize] = useState(10);
  const [audOffset, setAudOffset] = useState(0);

  const [groupPage, setGroupPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(10);

  const groupPagedData = useMemo(() => {
    if (!groupContacts) return [];
    const start = (groupPage - 1) * groupPageSize;
    return groupContacts.slice(start, start + groupPageSize);
  }, [groupContacts, groupPage, groupPageSize]);

  const normalizeHeader = (h = "") =>
    h.toString().trim().toLowerCase().replace(/\s+/g, "");

  const toAudienceRow = (obj) => {
    const entries = Object.entries(obj || {}).reduce((acc, [k, v]) => {
      acc[normalizeHeader(k)] = v;
      return acc;
    }, {});
    const countryCode =
      entries["countrycode"] ??
      entries["country_code"] ??
      entries["code"] ??
      entries["country"] ??
      "";
    const msisdn =
      entries["mobile_number"] ??
      entries["mobilenumber"] ??
      entries["msisdn"] ??
      entries["phonenumber"] ??
      entries["phone"] ??
      entries["mobile"] ??
      entries["number"] ??
      "";

    if (!countryCode && !msisdn) return null;

    const row = {
      countryCode: String(countryCode || "").trim(),
      msisdn: String(msisdn || "").trim(),
    };
    const standardKeys = [
      "countrycode",
      "country_code",
      "code",
      "country",
      "mobile_number",
      "mobilenumber",
      "msisdn",
      "phonenumber",
      "phone",
      "mobile",
      "number",
    ];
    Object.entries(obj).forEach(([k, v]) => {
      if (!standardKeys.includes(normalizeHeader(k))) row[k] = v;
    });
    return row;
  };

  const parseCSV = async (file) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
    if (!lines.length) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",");
      const obj = {};
      headers.forEach((h, i) => (obj[h] = cols[i]));
      return toAudienceRow(obj);
    });
    return rows.filter(Boolean);
  };

  const parseExcel = async (file) => {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws);
    return json.map(toAudienceRow).filter(Boolean);
  };

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleFile = async (file) => {
    try {
      setUploadErr("");
      if (!file) return;
      setRawFile(file);
      setDuplicateRemovalStatus("No");
      const ext = file.name.split(".").pop().toLowerCase();
      let rows = [];
      if (ext === "csv") rows = await parseCSV(file);
      else if (["xlsx", "xls"].includes(ext)) rows = await parseExcel(file);
      else {
        setUploadErr("Please upload a .xlsx, .xls, or .csv file.");
        return;
      }
      if (!rows.length) {
        setUploadErr(
          "No valid rows found. Make sure the sheet has headers like Country Code and Mobile Number.",
        );
        return;
      }

      if (rows.length > 0) {
        const firstRow = rows[0];
        const headers = Object.keys(firstRow).filter(
          (k) => k !== "countryCode" && k !== "msisdn",
        );
        setDynamicHeaders(headers);
      }

      const uniqueMap = new Map();
      const duplicates = [];
      const uniqueRows = [];
      rows.forEach((row) => {
        const key = `${row.countryCode}-${row.msisdn}`;
        if (uniqueMap.has(key)) duplicates.push(row);
        else {
          uniqueMap.set(key, true);
          uniqueRows.push(row);
        }
      });

      setAudienceRows(rows);
      setDuplicateRows(duplicates);
      setAudPage(1);
      setAudPageSize(10);
      setAudOffset(0);
    } catch (err) {
      console.error(err);
      setUploadErr(
        "Could not read the file. Please check the format and try again.",
      );
    }
  };

  const removeDuplicates = () => {
    const uniqueMap = new Map();
    const uniqueRows = [];
    audienceRows.forEach((row) => {
      const key = `${row.countryCode}-${row.msisdn}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, true);
        uniqueRows.push(row);
      }
    });
    setAudienceRows(uniqueRows);
    setDuplicateRows([]);
    setDuplicateRemovalStatus("Yes");
  };

  const downloadSampleCSV = () => {
    let headers = ["Country Code", "Mobile Number"];
    let rowValues = ["91", "9000000000"];
    if (formData.templateId) {
      const selectedTpl = templates.find(
        (t) => t.id === formData.templateId,
      )?.original;
      if (selectedTpl?.templateStructure?.components) {
        const allText = selectedTpl.templateStructure.components
          .filter((c) => ["BODY", "HEADER"].includes(c.type))
          .map((c) => c.text || "")
          .join(" ");
        const matches = allText.match(/{{(\d+)}}/g);
        if (matches) {
          const uniqueVars = new Set(matches);
          for (let i = 1; i <= uniqueVars.size; i++) {
            headers.push(`var${i}`);
            rowValues.push(`value${i}`);
          }
        }
      }
    }
    const csvContent = [headers.join(","), rowValues.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sample_audience.csv";
    link.click();
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const audienceColumns = useMemo(() => {
    const baseCols = [
      {
        title: "S.no",
        key: "s_no",
        Cell: (_row, rowIndex) => (audPage - 1) * audPageSize + rowIndex + 1,
      },
      { title: "Country Code", key: "countryCode" },
      { title: "Mobile Number", key: "msisdn" },
    ];
    const dynCols = dynamicHeaders.map((h) => ({ title: h, key: h }));
    return [...baseCols, ...dynCols];
  }, [audPage, audPageSize, dynamicHeaders]);

  return (
    <div className="flex flex-col w-full h-full bg-slate-50 overflow-hidden">
      <Navbar
        title="Create Campaign"
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
            label: "Campaign",
            route:
              authRole === "TL"
                ? "/tl-whatsapp?tab=Campaign"
                : "/admin-whatsapp?tab=Campaign",
          },
          { label: "Create Campaign", active: true },
        ]}
      />

      {step === "details" && (
        <Form {...form}>
          <form
            className="flex-1 overflow-y-auto p-6"
            onSubmit={handleSubmitStep1}
          >
            <div className="max-w-[1400px] mx-auto w-full mt-2">
              <SectionCard title="Campaign Details" icon={Settings}>
                <div className="flex flex-col gap-6">
                  <FormField
                    control={form.control}
                    name="campaignName"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1.5 w-full md:w-1/2">
                        <FormLabel>Campaign Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter Campaign Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="campaignCategory"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-3">
                        <FormLabel>Campaign Category</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {["marketing", "utility"].map((key) => {
                              const meta = CATEGORY_META[key];
                              const active = field.value === key;
                              const IconComp = meta.icon;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  className={cn(
                                    "flex flex-col text-left p-4 rounded-xl border-2 transition-all cursor-pointer",
                                    active
                                      ? "border-primary bg-primary/5"
                                      : "border-slate-200 hover:border-slate-300 bg-white",
                                  )}
                                  onClick={() =>
                                    handleChange("campaignCategory", key)
                                  }
                                >
                                  <div
                                    className={cn(
                                      "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                                      active
                                        ? "bg-primary text-white"
                                        : "bg-slate-100 text-slate-600",
                                    )}
                                  >
                                    <IconComp className="w-5 h-5" />
                                  </div>
                                  <div className="font-bold text-slate-800 mb-1">
                                    {meta.title}
                                  </div>
                                  <div className="text-xs text-slate-500 leading-relaxed">
                                    {meta.desc}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Continue</Button>
                </div>
              </SectionCard>
            </div>
          </form>
        </Form>
      )}

      {step === "dev" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1400px] mx-auto flex flex-col xl:flex-row gap-6">
            {/* Left Column */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">
              <SectionCard title="Campaign Details" icon={Settings}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Campaign Category</Label>
                    <Input
                      value={titleFromKey(formData.campaignCategory)}
                      disabled
                      className="bg-slate-50"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Campaign Name</Label>
                    <Input
                      value={formData.campaignName}
                      disabled
                      className="bg-slate-50"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Configure Template"
                icon={Puzzle}
                hint="Choose the template you need to send as a notification"
              >
                <div className="relative group -mx-2">
                  <button
                    type="button"
                    disabled={!canLeft}
                    className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center text-slate-600 hover:text-primary transition-all duration-200",
                      canLeft ? "opacity-100 cursor-pointer" : "opacity-0 pointer-events-none"
                    )}
                    onClick={() => scrollByCards("left", 1)}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div
                    className="flex overflow-x-auto gap-4 py-2 px-2 snap-x hide-scrollbar"
                    ref={carouselRef}
                    onScroll={updateArrows}
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {templates.map((t) => {
                      const selected = formData.templateId === t.id;
                      const isDisabled =
                        formData.audienceSource === "group" && t.hasVariables;

                      return (
                        <div
                          key={t.id}
                          className={cn(
                            "flex-shrink-0 w-[260px] p-5 rounded-xl border-2 cursor-pointer transition-all snap-center relative bg-white",
                            selected
                              ? "border-primary shadow-md bg-primary/5"
                              : "border-slate-200 hover:border-slate-300 shadow-sm",
                            isDisabled &&
                              "opacity-50 cursor-not-allowed grayscale",
                          )}
                          onClick={() => {
                            if (isDisabled) {
                              toast.error(
                                "Group campaigns do not support templates with variables",
                              );
                              return;
                            }
                            handleChange("templateId", t.id);
                          }}
                        >
                          {isDisabled && (
                            <div
                              className="absolute top-3 right-3 text-rose-500 bg-rose-50 rounded-full p-1"
                              title="Variables not supported with Groups"
                            >
                              <Info className="w-4 h-4" />
                            </div>
                          )}
                          <div className="font-bold text-slate-800 truncate mb-1.5 pr-6">
                            {t.name}
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-3 mb-4 min-h-[48px]">
                            {t.desc}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wide">
                            {t.actionType === "call" ? (
                              <Phone className="w-3.5 h-3.5" />
                            ) : t.actionType === "link" ? (
                              <LinkIcon className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                            {t.action}
                          </div>
                        </div>
                      );
                    })}
                    {templates.length === 0 && (
                      <div className="p-4 text-slate-500 text-sm">
                        No templates available.
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!canRight}
                    className={cn(
                      "absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center text-slate-600 hover:text-primary transition-all duration-200",
                      canRight ? "opacity-100 cursor-pointer" : "opacity-0 pointer-events-none"
                    )}
                    onClick={() => scrollByCards("right", 1)}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </SectionCard>

              <SectionCard title="Create Audience" icon={Users}>
                <div className="flex items-center gap-3 mb-4">
                  <Button
                    variant={
                      formData.audienceSource === "file"
                        ? "default"
                        : "secondary"
                    }
                    onClick={() => handleChange("audienceSource", "file")}
                  >
                    Upload File
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={
                        formData.audienceSource === "group"
                          ? "default"
                          : "secondary"
                      }
                      onClick={() => {
                        if (selectedTemplate?.hasVariables) {
                          toast.error(
                            "Group campaigns do not support templates with variables",
                          );
                          return;
                        }
                        handleChange("audienceSource", "group");
                      }}
                      disabled={selectedTemplate?.hasVariables}
                    >
                      Select Group
                    </Button>
                    {selectedTemplate?.hasVariables && (
                      <Info
                        className="w-4 h-4 text-rose-500"
                        title="Group campaigns do not support templates with variables"
                      />
                    )}
                  </div>
                </div>

                {formData.audienceSource === "group" ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5 max-w-[400px]">
                      <Label>Select Group</Label>
                      <GroupsDropdown
                        value={formData.selectedGroupId}
                        onChange={(val) => handleChange("selectedGroupId", val)}
                      />
                    </div>
                    {formData.selectedGroupId && (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <DataTable
                          columns={[
                            {
                              title: "S.no",
                              key: "s_no",
                              Cell: (_row, rowIndex) =>
                                (groupPage - 1) * groupPageSize + rowIndex + 1,
                            },
                            { title: "Country Code", key: "countryCode" },
                            { title: "Mobile Number", key: "msisdn" },
                          ]}
                          data={groupPagedData}
                          totaldata={groupContacts?.length || 0}
                          page={groupPage}
                          pageSize={groupPageSize}
                          onPageChange={(val) => {
                            setGroupPage(val.currentPage);
                            setGroupPageSize(val.pageSize);
                          }}
                          loading={getGroupContactsLoading}
                          serverSide={false}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {audienceRows.length === 0 ? (
                      <div className="flex flex-col gap-3">
                        <Label
                          className="flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors text-center"
                          onDragOver={onDragOver}
                          onDrop={onDrop}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".xlsx,.xls,.csv"
                            onChange={onInputChange}
                          />
                          <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100 mb-2">
                            <Upload className="w-6 h-6 text-primary" />
                          </div>
                          <div className="text-sm text-slate-600">
                            <span className="text-primary font-bold hover:underline">
                              Click to upload
                            </span>{" "}
                            or drag and drop here
                          </div>
                          <div className="text-xs text-slate-400 font-medium tracking-wide">
                            Supports .CSV, .XLSX, .XLS
                          </div>
                        </Label>
                        <div className="flex justify-end">
                          <Button
                            variant="link"
                            size="sm"
                            onClick={downloadSampleCSV}
                            className="text-xs text-primary h-auto p-0"
                          >
                            Download Sample CSV
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <DataTable
                            columns={audienceColumns}
                            data={audienceRows}
                            totaldata={audienceRows.length}
                            page={audPage}
                            pageSize={audPageSize}
                            onPageChange={(val) => {
                              setAudPage(val.currentPage);
                              setAudPageSize(val.pageSize);
                            }}
                            serverSide={false}
                          />
                        </div>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-4">
                            {duplicateRows.length > 0 && (
                              <>
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                                  <span className="text-sm font-semibold text-amber-600">
                                    {duplicateRows.length} duplicates found
                                  </span>
                                </div>
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-slate-500 text-xs"
                                  onClick={() => setViewDup(!viewDup)}
                                >
                                  {viewDup ? "Hide List" : "View List"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={removeDuplicates}
                                  className="border-amber-200 text-amber-700 hover:bg-amber-50"
                                >
                                  Remove Duplicates
                                </Button>
                              </>
                            )}
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setAudienceRows([]);
                              setDuplicateRows([]);
                              setViewDup(false);
                              setRawFile(null);
                            }}
                          >
                            Re-upload File
                          </Button>
                        </div>
                        {viewDup && duplicateRows.length > 0 && (
                          <div className="max-h-[150px] overflow-y-auto bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs font-mono text-amber-800">
                            {duplicateRows.map((r, i) => (
                              <div key={i}>
                                {r.countryCode} {r.msisdn}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {uploadErr && <FormInputError message={uploadErr} />}
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Right Column: Preview & Schedule */}
            <div className="w-full lg:w-[260px] shrink-0 flex flex-col gap-6">
              <div className="sticky top-6 flex flex-col gap-6">
                {/* Phone Preview */}
                <div>
                  <Label className="uppercase tracking-wide text-slate-500 mb-4 block">
                    Preview
                  </Label>
                  <div className="relative w-[240px] h-[488px] mx-auto select-none">
                    <img
                      src={phone}
                      alt="Phone"
                      className="w-full h-full pointer-events-none drop-shadow-xl"
                    />

                    <div className="absolute top-[75px] bottom-[68px] left-[16px] right-[16px] overflow-y-auto px-2 py-2 bg-[#efeae2] z-10 custom-scrollbar">
                      <div className="bg-[#E2F7CB] p-3 rounded-lg shadow-sm font-sans text-[13px] leading-relaxed text-[#111B21] relative break-words">
                        <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-[#E2F7CB] border-l-[10px] border-l-transparent" />

                        {formData.templateId ? (
                          (() => {
                            const selectedTpl = templates.find(
                              (t) => t.id === formData.templateId,
                            )?.original;
                            if (!selectedTpl)
                              return (
                                <div className="text-slate-500 italic text-center py-4">
                                  Select a template
                                </div>
                              );

                            return (
                              <div className="flex flex-col gap-1.5">
                                {selectedTpl.templateStructure?.components?.map(
                                  (comp, idx) => {
                                    if (comp.type === "BODY")
                                      return (
                                        <p
                                          key={idx}
                                          className="whitespace-pre-wrap break-words"
                                        >
                                          {comp.text}
                                        </p>
                                      );
                                    if (comp.type === "FOOTER")
                                      return (
                                        <p
                                          key={idx}
                                          className="text-[#667781] text-[11px] mt-1.5 uppercase tracking-wide break-words"
                                        >
                                          {comp.text}
                                        </p>
                                      );
                                    return null;
                                  },
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
                            );
                          })()
                        ) : (
                          <div className="text-slate-500 italic text-center py-4">
                            Select a template to preview
                          </div>
                        )}
                      </div>

                      {/* Buttons Preview */}
                      {formData.templateId &&
                        (() => {
                          const selectedTpl = templates.find(
                            (t) => t.id === formData.templateId,
                          )?.original;
                          const btnsComp =
                            selectedTpl?.templateStructure?.components?.find(
                              (c) => c.type === "BUTTONS",
                            );
                          if (!btnsComp?.buttons?.length) return null;
                          return (
                            <div className="flex flex-col gap-1.5 mt-2">
                              {btnsComp.buttons.map((btn, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white rounded-lg text-[#00A884] font-medium text-[13px] shadow-sm cursor-default"
                                >
                                  {btn.type === "url" ? (
                                    <>
                                      <LinkIcon className="w-3.5 h-3.5" />{" "}
                                      {btn.text}
                                    </>
                                  ) : btn.type === "phone_number" ? (
                                    <>
                                      <Phone className="w-3.5 h-3.5" />{" "}
                                      {btn.text}
                                    </>
                                  ) : (
                                    btn.text
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                    </div>
                  </div>
                </div>

                {/* Schedule Campaign */}
                {(audienceRows.length > 0 ||
                  (formData.audienceSource === "group" &&
                    formData.selectedGroupId)) && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="font-bold text-slate-800">
                        Schedule Campaign
                      </h3>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label>Select Date & Time</Label>
                      <DateTimeRangePicker
                        type="single"
                        showTime={true}
                        showDate={true}
                        align="right"
                        onChange={(val) =>
                          handleChange("scheduleTime", val.value)
                        }
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 mt-1">
                      <Info className="w-5 h-5 text-blue-500 shrink-0" />
                      <p className="text-xs text-blue-700 leading-relaxed">
                        Your campaign will start once the campaign audience is
                        processed, which may take approximately 5-15 minutes.
                      </p>
                    </div>

                    <div className="flex justify-end gap-3 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep("details")}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        disabled={createCampaignLoading}
                        onClick={async () => {
                          if (formData.audienceSource === "file" && !rawFile)
                            return toast.error(
                              "Please upload an audience file",
                            );
                          if (
                            formData.audienceSource === "group" &&
                            !formData.selectedGroupId
                          )
                            return toast.error("Please select a group");
                          if (!formData.scheduleTime)
                            return toast.error("Please select a schedule time");
                          if (!formData.templateId)
                            return toast.error("Please select a template");

                          const selectedTemplate = templates.find(
                            (t) => t.id === formData.templateId,
                          )?.original;

                          if (
                            formData.audienceSource === "group" &&
                            selectedTemplate?.templateStructure?.components
                          ) {
                            const allText =
                              selectedTemplate.templateStructure.components
                                .filter((c) =>
                                  ["BODY", "HEADER"].includes(c.type),
                                )
                                .map((c) => c.text || "")
                                .join(" ");
                            if (allText.match(/{{(\d+)}}/g))
                              return toast.error(
                                "Group campaigns do not support templates with variables.",
                              );
                          }

                          const d = new Date(formData.scheduleTime);
                          const formattedTime = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;

                          const payload = {
                            campaignName: formData.campaignName,
                            campaignCategory: formData.campaignCategory,
                            templateName: selectedTemplate?.templateName || "",
                            templateId: selectedTemplate?.templateId || "",
                            scheduleTime: formattedTime,
                            audienceSource: formData.audienceSource,
                          };

                          if (formData.audienceSource === "file") {
                            payload.file = rawFile;
                            payload.fileName = rawFile.name;
                            payload.duplicateRemovalStatus =
                              duplicateRemovalStatus;
                          } else {
                            payload.groupId = formData.selectedGroupId;
                          }

                          const res = await createCampaign(payload);
                          if (res)
                            navigate(
                              authRole === "TL"
                                ? "/tl-whatsapp?tab=Campaign"
                                : "/admin-whatsapp?tab=Campaign",
                            );
                        }}
                      >
                        {createCampaignLoading && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        {createCampaignLoading
                          ? "Creating..."
                          : "Create Campaign"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWhatsappCreateCampaign;
