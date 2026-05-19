import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/AdminWhatsappCreateCampaign.css";
import "../../agent/conversation/styles/ConversationMessageContainer.css";
import Icon from "../../../constants/Icon.jsx";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useWaTemplateStore } from "../../../store/admin/whatsapp/useWaTemplateStore.js";
import { useWhatsappStore } from "../../../store/admin/whatsapp/useWhatsappStore.js";
import { Button, Input, Select, Table, DateTimeRangePicker, Tooltip } from "../../../components/Index.jsx";
import phone from "../../../assets/background/Iphone.svg";
import { toast } from "../../../store/useToastStore.js";
import GroupsDropdown from "./components/GroupsDropdown.jsx";

const CATEGORY_META = {
  marketing: {
    title: "Marketing",
    desc:
      "Campaigns in this category are used to send promotions or information about your products, services or business",
    icon: "🧩",
  },
  utility: {
    title: "Utility",
    desc: "Use it to make changes directly on data tables, e.g. Product Price Factor",
    icon: "🛠️",
  },
};

const AdminWhatsappCreateCampaign = () => {
  const navigate = useNavigate();
  const { authRole } = useAuthStore();
  const { createCampaign, createCampaignLoading, getGroupContacts, groupContacts, getGroupContactsLoading } = useWhatsappStore();

  // ---------- unified form state ----------
  const [formData, setFormData] = useState({
    campaignName: "",
    campaignCategory: "", // "marketing" | "utility"
    language: "",
    templateId: "", // selected template id (from carousel)
    audienceSource: "file", // "file" | "group"
    selectedGroupId: "",
  });



  const [errors, setErrors] = useState({});
  const [step, setStep] = useState("details"); // "details" | "dev"

  useEffect(() => {
    if (formData.audienceSource === "group" && formData.selectedGroupId) {
      getGroupContacts(formData.selectedGroupId);
    }
  }, [formData.audienceSource, formData.selectedGroupId]);


  const handleChange = (field, value) => {
    // If changing category, check for existing templates first
    if (field === "campaignCategory") {
      const hasTemplates = rawTemplates?.some(
        (t) =>
          t.templateCategory &&
          t.templateCategory.toLowerCase() === value.toLowerCase()
      );

      if (!hasTemplates) {
        toast.error(`No template found for ${value} category`);
        return;
      }
    }

    setFormData((p) => ({ ...p, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  // ---------- Step 1 validation ----------
  const validateStep1 = () => {
    const e = {};
    if (!formData.campaignCategory) e.campaignCategory = "Choose a category";
    if (!formData.campaignName.trim()) e.campaignName = "Enter a campaign name";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmitStep1 = (e) => {
    e.preventDefault();
    if (!validateStep1()) return;
    console.log("✅ Step 1 payload:", formData);
    setStep("dev");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const titleFromKey = (k) => CATEGORY_META[k]?.title || k;

  // =========================
  // Configure Template — carousel
  // =========================
  const { templates: rawTemplates, getTemplates } = useWaTemplateStore();

  useEffect(() => {
    // Fetch templates on mount
    getTemplates(50, 0, "", "", "");
  }, []);

  const templates = useMemo(() => {
    if (!rawTemplates || !Array.isArray(rawTemplates)) return [];

    // Filter by category if selected
    const filtered = rawTemplates.filter((t) => {
      if (!formData.campaignCategory) return true;
      return (
        t.templateCategory &&
        t.templateCategory.toLowerCase() === formData.campaignCategory.toLowerCase()
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
        id: t._id || t.templateName, // verify unique ID
        name: t.templateName,
        desc: bodyComp?.text || "No content",
        action: actionLabel,
        actionType,
        hasVariables,
        // keep full obj if needed
        original: t,
      };
    });
  }, [rawTemplates, formData.campaignCategory]);

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === formData.templateId);
  }, [formData.templateId, templates]);

  const carouselRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const el = carouselRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // tolerance of 2px
    setCanLeft(scrollLeft > 2);
    setCanRight(scrollLeft + clientWidth < scrollWidth - 2);
  };

  useEffect(() => {
    // Update arrows whenever templates change
    const tId = setTimeout(updateArrows, 100);
    window.addEventListener("resize", updateArrows);
    return () => {
      clearTimeout(tId);
      window.removeEventListener("resize", updateArrows);
    };
  }, [templates]);

  const scrollByCards = (dir = "right", cards = 1) => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = 260; // ≈ card width incl. gap
    const delta = (dir === "left" ? -1 : 1) * cardWidth * cards;
    el.scrollBy({ left: delta, behavior: "smooth" });
    setTimeout(updateArrows, 300);
  };

  // =========================
  // Create Audience — upload + parse + render with <Table />
  // =========================
  const [audienceRows, setAudienceRows] = useState([]); // [{ countryCode, msisdn }, ...]
  const [duplicateRows, setDuplicateRows] = useState([]); // [{ countryCode, msisdn }, ...]
  const [dynamicHeaders, setDynamicHeaders] = useState([]);
  const [duplicateRemovalStatus, setDuplicateRemovalStatus] = useState("No");
  const [rawFile, setRawFile] = useState(null);
  const [viewDup, setViewDup] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const fileInputRef = useRef(null);

  // Table paging for audience
  const [audPage, setAudPage] = useState(1);
  const [audPageSize, setAudPageSize] = useState(10);
  const [audOffset, setAudOffset] = useState(0);

  const [audSortField, setAudSortField] = useState("");
  const [audSortOrder, setAudSortOrder] = useState("asc");

  // Group Contacts Pagination
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
      entries["countrycode"] ?? entries["country_code"] ?? entries["code"] ?? entries["country"] ?? "";
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

    // Add dynamic keys
    const standardKeys = [
      "countrycode", "country_code", "code", "country",
      "mobile_number", "mobilenumber", "msisdn", "phonenumber", "phone", "mobile", "number"
    ];

    Object.entries(obj).forEach(([k, v]) => {
      if (!standardKeys.includes(normalizeHeader(k))) {
        row[k] = v;
      }
    });

    return row;
  };

  const audiencePagedData = useMemo(
    () => audienceRows.slice(audOffset, audOffset + audPageSize),
    [audienceRows, audOffset, audPageSize]
  );

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
    const json = XLSX.utils.sheet_to_json(ws); // [{...}]
    return json.map(toAudienceRow).filter(Boolean);
  };

  const handleFile = async (file) => {
    try {
      setUploadErr("");
      if (!file) return;
      setRawFile(file);
      setDuplicateRemovalStatus("No"); // Reset on new upload
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
          "No valid rows found. Make sure the sheet has headers like Country Code and Mobile Number."
        );
        return;
      }

      // Extract dynamic headers from the first row
      if (rows.length > 0) {
        const firstRow = rows[0];
        const headers = Object.keys(firstRow).filter(
          (k) => k !== "countryCode" && k !== "msisdn"
        );
        setDynamicHeaders(headers);
      }

      // Check for duplicates
      const uniqueMap = new Map();
      const duplicates = [];
      const uniqueRows = [];

      rows.forEach((row) => {
        const key = `${row.countryCode}-${row.msisdn}`;
        if (uniqueMap.has(key)) {
          duplicates.push(row);
        } else {
          uniqueMap.set(key, true);
          uniqueRows.push(row);
        }
      });

      setAudienceRows(rows); // Initially show all, or unique? User asked "if duplicates exists show... and click to button remove". So we likely keep all initially or just track them. 
      // Actually, standard behavior is usually to keep what was uploaded but warn. 
      // User said: "if duplicates exits show duplicates count... click to button remove duplicates".
      // So I will set `audienceRows` to `rows` (all) but also set `duplicateRows` to `duplicates`.

      // So I will set `audienceRows` to `rows` (all) but also set `duplicateRows` to `duplicates`.

      setDuplicateRows(duplicates);

      // reset pagination on new upload
      setAudPage(1);
      setAudPageSize(10);
      setAudOffset(0);
      console.log("✅ Audience rows:", rows, "Duplicates:", duplicates);
    } catch (err) {
      console.error(err);
      setUploadErr("Could not read the file. Please check the format and try again.");
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
    // defaults
    let headers = ["Country Code", "Mobile Number"];
    let rowValues = ["91", "9000000000"];

    // Find the selected template object
    if (formData.templateId) {
      const selectedTpl = templates.find((t) => t.id === formData.templateId)?.original;

      if (selectedTpl?.templateStructure?.components) {
        // Collect all variable placeholders like {{1}}, {{2}} from BODY (and possibly HEADER)
        const allText = selectedTpl.templateStructure.components
          .filter((c) => ["BODY", "HEADER"].includes(c.type))
          .map((c) => c.text || "")
          .join(" ");

        // Regex to find unique {{digits}}
        const matches = allText.match(/{{(\d+)}}/g);
        if (matches) {
          const uniqueVars = new Set(matches);
          const varCount = uniqueVars.size;

          // Add var1, var2... for each unique variable
          for (let i = 1; i <= varCount; i++) {
            headers.push(`var${i}`);
            rowValues.push(`value${i}`);
          }
        }
      }
    }

    const csvContent = [headers.join(","), rowValues.join(",")].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_audience.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onClickUpload = () => fileInputRef.current?.click();
  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFile(file);
    e.target.value = ""; // allow same file re-select
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const audienceColumns = useMemo(
    () => {
      const baseCols = [
        {
          title: "S.no",
          key: "s_no",
          Cell: (_row, rowIndex) => (audPage - 1) * audPageSize + rowIndex + 1,
        },
        { title: "Country Code", key: "countryCode" },
        { title: "Mobile Number", key: "msisdn" },
      ];

      const dynCols = dynamicHeaders.map((h) => ({
        title: h,
        key: h,
      }));

      return [...baseCols, ...dynCols];
    },
    [audPage, audPageSize, dynamicHeaders]
  );



  // =========================

  return (
    <div className="WhatsappCreateTemplate">
      {/* Navbar */}
      <div className="navbar_1">
        <div>
          <p className="navbar_1_heading">Create Campaign</p>
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
            <span className="navbar_1_breadcrumb_item" onClick={() => navigate("/admin-whatsapp")}>
              Whatsapp
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span className="navbar_1_breadcrumb_item" onClick={() => navigate("/admin-whatsapp?tab=Campaign")}>
              Campaign
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span className="navbar_1_breadcrumb_item active">Create Campaign</span>
          </span>
        </div>
      </div>

      {/* STEP 1 */}
      {step === "details" && (
        <form className="awcc__layout" onSubmit={handleSubmitStep1}>
          <div className="awcc__card">
            <div className="awcc__title">Campaign Details</div>

            <div className="awcc__row" style={{ display: "block" }}>
              <div className="awcc__field" style={{ minWidth: 320 }}>
                <label>Campaign Name</label>
                <Input
                  width={'300px'}
                  placeholder="Enter Campaign Name"
                  value={formData.campaignName}
                  onChange={(e) => handleChange("campaignName", e.target.value)}
                />
                {errors.campaignName && <div className="awcc__err">{errors.campaignName}</div>}
              </div>
              <div className="awcc__field">
                <label>Campaign Category</label>
                <div className="awcc__cards">
                  {["marketing", "utility"].map((key) => {
                    const meta = CATEGORY_META[key];
                    const active = formData.campaignCategory === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`awcc__cardItem ${active ? "active" : ""}`}
                        onClick={() => handleChange("campaignCategory", key)}
                      >
                        <div className="awcc__cardIcon">{meta.icon}</div>
                        <div className="awcc__cardTitle">{meta.title}</div>
                        <div className="awcc__cardDesc">{meta.desc}</div>
                      </button>
                    );
                  })}
                </div>
                {errors.campaignCategory && <div className="awcc__err">{errors.campaignCategory}</div>}
              </div>


            </div>

            <div className="awcc__actions">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleSubmitStep1}>
                Continue
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* STEP 2 */}
      {step === "dev" && (
        <div className="awcc__layout awcc__twoCol">
          {/* LEFT */}
          <div className="awcc__col">
            {/* Campaign Details (disabled) */}
            <div className="awcc__card">
              <div className="awcc__title">Campaign Details</div>
              <div className="awcc__row">
                <div className="awcc__field" style={{ minWidth: 300 }}>
                  <label>Campaign Category</label>
                  <Input value={titleFromKey(formData.campaignCategory)} disabled placeholder="Select" />
                </div>
                <div className="awcc__field" style={{ minWidth: 300 }}>
                  <label>Campaign Name</label>
                  <Input value={formData.campaignName} disabled placeholder="Enter" />
                </div>
              </div>
            </div>

            {/* Configure Template (carousel only) */}
            <div className="awcc__card">
              <div className="awcc__title">Configure Template</div>
              <div className="awcc__hint">Choose the template you need to send as a notification</div>

              <div className="awcc__carouselWrap">
                {canLeft && (
                  <button
                    type="button"
                    className="awcc__navBtn left"
                    onClick={() => scrollByCards("left", 1)}
                    aria-label="Scroll left"
                  >
                    ‹
                  </button>
                )}

                <div
                  className="awcc__carousel awcc__carousel--scroll"
                  ref={carouselRef}
                  onScroll={updateArrows}
                >
                  {templates.map((t) => {
                    const selected = formData.templateId === t.id;

                    const isDisabled = formData.audienceSource === "group" && t.hasVariables;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`awcc__tplCard ${selected ? "selected" : ""} ${isDisabled ? "disabled-template" : ""}`}
                        style={isDisabled ? { opacity: 0.5, cursor: "not-allowed", position: "relative" } : {}}
                        onClick={() => {
                          if (isDisabled) {
                            toast.error("Group campaigns do not support templates with variables");
                            return;
                          }
                          handleChange("templateId", t.id);
                        }}
                        title={isDisabled ? "This template has variables and cannot be used with Groups" : t.name}
                      >
                        {isDisabled && (
                          <div style={{ position: "absolute", top: 5, right: 5, zIndex: 10 }}>
                            <Icon name="info" size={16} color="red" />
                          </div>
                        )}
                        <div className="awcc__tplTitle">{t.name}</div>
                        <div className="awcc__tplDesc">{t.desc}</div>
                        <div className="awcc__tplAction">
                          {t.actionType === "call"
                            ? "📞"
                            : t.actionType === "link"
                              ? <Icon name="link" size={16} />
                              : <Icon name="eye" size={16} />}{" "}
                          {t.action}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {canRight && (
                  <button
                    type="button"
                    className="awcc__navBtn right"
                    onClick={() => scrollByCards("right", 1)}
                    aria-label="Scroll right"
                  >
                    ›
                  </button>
                )}
              </div>


            </div>

            {/* Create Audience (Upload -> Table) - MOVED HERE */}
            <div className="awcc__card">
              <div className="awcc__title">Create Audience</div>

              <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "center" }}>
                <Button
                  variant={formData.audienceSource === "file" ? "primary" : "secondary"}
                  onClick={() => handleChange("audienceSource", "file")}
                >
                  Upload File
                </Button>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Button
                    variant={formData.audienceSource === "group" ? "primary" : "secondary"}
                    onClick={() => {
                      if (selectedTemplate?.hasVariables) {
                        toast.error("Group campaigns do not support templates with variables");
                        return;
                      }
                      handleChange("audienceSource", "group");
                    }}
                    disabled={selectedTemplate?.hasVariables}
                  >
                    Select Group
                  </Button>
                  <Tooltip content={selectedTemplate?.hasVariables ? "Group campaigns do not support templates with variables" : "Group campaigns do not support templates with variables"}>
                    <Icon name="info" size={16} color={selectedTemplate?.hasVariables ? "red" : "#64748b"} />
                  </Tooltip>
                </div>
              </div>

              {formData.audienceSource === "group" ? (
                <div className="awcc__field">
                  <label>Select Group</label>
                  <GroupsDropdown
                    value={formData.selectedGroupId}
                    onChange={(val) => handleChange("selectedGroupId", val)}
                  />

                  {/* Group Contacts Table */}
                  {formData.selectedGroupId && (
                    <div style={{ marginTop: 20 }}>
                      <Table
                        columns={[
                          {
                            title: "S.no",
                            key: "s_no",
                            Cell: (_row, rowIndex) => (groupPage - 1) * groupPageSize + rowIndex + 1,
                          },
                          { title: "Country Code", key: "countryCode" },
                          { title: "Mobile Number", key: "msisdn" },
                          // Add dynamic attributes col if needed
                        ]}
                        data={groupPagedData} // Use sliced data
                        totaldata={groupContacts.length}
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
                <>
                  {/* File Upload UI */}
                  {audienceRows.length === 0 ? (
                    <>
                      <div
                        className="awcc__uploadBox"
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && onClickUpload()}
                        onClick={onClickUpload}
                      >
                        <div className="awcc__uploadInner">
                          <div className="awcc__uploadIcon" aria-hidden>
                            📄<span className="awcc__upArrow">⬆️</span>
                          </div>
                          <div>
                            <span className="awcc__uploadLink" onClick={onClickUpload}>
                              Click to upload
                            </span>{" "}
                            or drag and drop here
                          </div>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={onInputChange}
                          style={{ display: "none" }}
                        />
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="button" variant="empty" onClick={(e) => { e.stopPropagation(); downloadSampleCSV(); }}>
                          <span style={{ textDecoration: 'underline', fontSize: '13px', color: '#2563eb' }}>Download Sample CSV</span>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Table
                        columns={audienceColumns}
                        data={audienceRows}              // 👉 pass the full array
                        totaldata={audienceRows.length}
                        page={audPage}
                        serverSide={false}               // client-side pagination by Table
                        pageSize={audPageSize}
                        onPageChange={(pagevalues) => {
                          setAudPage(pagevalues.currentPage);
                          setAudPageSize(pagevalues.pageSize);
                          // no manual offset needed when serverSide=false
                          setAudSortField(pagevalues.sortConfig.key);
                          setAudSortOrder(pagevalues.sortConfig.direction);
                        }}
                      />
                      <div className="awcc__tableActions">
                        {duplicateRows.length > 0 && (
                          <div className="awcc__dupAlert" style={{ marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ color: '#d97706', fontSize: '13px', fontWeight: 600 }}>
                                ⚠️ {duplicateRows.length} duplicates found
                              </span>
                              <span
                                style={{ fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', color: '#475569' }}
                                onClick={() => setViewDup(!viewDup)}
                              >
                                {viewDup ? "Hide List" : "View List"}
                              </span>
                              <Button type="button" variant="secondary" onClick={removeDuplicates} style={{ height: 28, fontSize: 12 }}>
                                Remove Duplicates
                              </Button>
                            </div>
                            {viewDup && (
                              <div style={{ maxHeight: 100, overflowY: 'auto', background: '#fffbeb', border: '1px solid #fcd34d', padding: 8, borderRadius: 6, fontSize: 12 }}>
                                {duplicateRows.map((r, i) => (
                                  <div key={i}>{r.countryCode} {r.msisdn}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <Button type="button" onClick={() => { setAudienceRows([]); setDuplicateRows([]); setViewDup(false); setRawFile(null); }}>
                          Re-upload
                        </Button>
                      </div>
                    </>
                  )}

                  {uploadErr && <div className="awcc__err" style={{ marginTop: 8 }}>{uploadErr}</div>}

                  {/* Close File Upload Block */}
                </>
              )}
            </div>
          </div>

          {/* RIGHT preview */}
          <aside className="awcc__col">
            {/* Phone Preview */}
            <div className="awcc__previewBox">
              <div className="awcc__phone-container">
                <img src={phone} alt="Phone Frame" className="awcc__phone-img" />
                <div className="awcc__chat-content">
                  {formData.templateId ? (() => {
                    const selectedTpl = templates.find(t => t.id === formData.templateId)?.original;
                    if (!selectedTpl) return <div className="awcc__chat-bubble">Select a template</div>;

                    return (
                      <div className="conversation_message_card" style={{ width: '100%' }}>
                        <div className="wa-template-message">
                          {selectedTpl.templateStructure?.components?.map((comp, idx) => (
                            <React.Fragment key={idx}>
                              {comp.type === "BODY" && <p className="wa-template-body">{comp.text}</p>}
                              {comp.type === "FOOTER" && <p className="wa-template-footer">{comp.text}</p>}
                              {comp.type === "BUTTONS" && (
                                <div className="wa-template-buttons">
                                  {comp.buttons?.map((btn, btnIdx) => (
                                    btn.type === "url" ? (
                                      <a
                                        key={btnIdx}
                                        href={btn.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="wa-template-btn"
                                        onClick={(e) => e.preventDefault()}
                                      >
                                        <Icon name="link" size={16} /> {btn.text}
                                      </a>
                                    ) : btn.type === "phone_number" ? (
                                      <span key={btnIdx} className="wa-template-btn">
                                        📞 {btn.text}
                                      </span>
                                    ) : (
                                      <span key={btnIdx} className="wa-template-btn">{btn.text}</span>
                                    )
                                  ))}
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="awcc__chat-bubble">Select a template to preview</div>
                  )}
                </div>
              </div>
            </div>

            {/* Schedule Campaign - MOVED TO RIGHT SIDEBAR */}
            {(audienceRows.length > 0 || (formData.audienceSource === "group" && formData.selectedGroupId)) && (
              <div className="awcc__card" style={{ marginTop: 16 }}>
                <div className="awcc__title">Schedule Campaign</div>

                <div className="awcc__field">
                  <label>Schedule Time</label>
                  <DateTimeRangePicker
                    type="single"
                    showTime={true}
                    showDate={true}
                    align="right"
                    onChange={(val) => handleChange("scheduleTime", val.value)}
                  />
                </div>

                <div style={{
                  marginTop: 12,
                  background: '#eff6ff',
                  border: '1px solid #dbeafe',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#1e40af',
                  lineHeight: '1.4'
                }}>
                  Your campaign will start once the campaign audience is processed, the same may take 5-15 minutes approximately.
                </div>

                <div className="awcc__actions" style={{ marginTop: 16 }}>
                  <Button type="button" variant="secondary" onClick={() => setStep("details")}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    disabled={createCampaignLoading}
                    onClick={async () => {
                      // Validation
                      if (formData.audienceSource === "file" && !rawFile) {
                        toast.error("Please upload an audience file");
                        return;
                      }
                      if (formData.audienceSource === "group" && !formData.selectedGroupId) {
                        toast.error("Please select a group");
                        return;
                      }

                      if (!formData.scheduleTime) {
                        toast.error("Please select a schedule time");
                        return;
                      }

                      const selectedTemplate = templates.find(t => t.id === formData.templateId)?.original;

                      // Validation for Variable Templates with Group
                      if (formData.audienceSource === "group" && selectedTemplate?.templateStructure?.components) {
                        const allText = selectedTemplate.templateStructure.components
                          .filter((c) => ["BODY", "HEADER"].includes(c.type))
                          .map((c) => c.text || "")
                          .join(" ");
                        if (allText.match(/{{(\d+)}}/g)) {
                          toast.error("Group campaigns do not support templates with variables. Please select a different template or upload a file.");
                          return;
                        }
                      }

                      // Format scheduleTime to "YYYY-MM-DD HH:mm:ss"
                      const d = new Date(formData.scheduleTime);
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      const hours = String(d.getHours()).padStart(2, '0');
                      const minutes = String(d.getMinutes()).padStart(2, '0');
                      const seconds = String(d.getSeconds()).padStart(2, '0');
                      const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

                      const payload = {
                        campaignName: formData.campaignName,
                        campaignCategory: formData.campaignCategory,
                        templateName: selectedTemplate?.templateName || "",
                        templateId: selectedTemplate?.templateId || "",
                        scheduleTime: formattedTime,
                        audienceSource: formData.audienceSource, // "file" or "group"
                      };

                      if (formData.audienceSource === "file") {
                        payload.file = rawFile;
                        payload.fileName = rawFile.name;
                        payload.duplicateRemovalStatus = duplicateRemovalStatus;
                      } else {
                        payload.groupId = formData.selectedGroupId;
                      }

                      const res = await createCampaign(payload);
                      if (res) {
                        navigate("/admin-whatsapp?tab=Campaign");
                      }
                    }}
                  >
                    {createCampaignLoading ? "Creating..." : "Continue"}
                  </Button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )
      }
    </div >
  );
};

export default AdminWhatsappCreateCampaign;

