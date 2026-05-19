import React, { useEffect, useState } from "react";
import Icon from "../../../constants/Icon.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import "./styles/AdminCampaignEdit.css";
import {
    Input,
    Select,
    Button,
    FormInputError,
    Loader,
    Switch,
    DateTimeRangePicker,
    Radio,
} from "../../../components/Index.jsx";
import { useCampaignStore } from "../../../store/admin/useCampaignStore.js";

const AdminCampaignEdit = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const {
        getMemberGroups,
        getPhoneNumberGroup,
        getFrom,
        getMemberGroupsLoading,
        getPhoneNumberGroupLoading,
        getFromLoading,
        memberGroupData,
        phoneNumberGroupData,
        formDatas,
        submitedit,
        editLoading,
        getEditDataLoading,
        getEditData,
        editdata
    } = useCampaignStore();
    const [editId, setEditId] = useState(parseInt(params.get("editId")))

    const formatDate = (date) => {
        if (!date) return "";
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };


    const [formData, setFormData] = useState({
        Name: "",
        memberids: [],
        groupId: "",
        formId: "",
        dialerType: "MANUAL",
        campaignRules: {
            limits: {
                maxtotalattempts: 0,
                maxattemptsper_day: 0,
                maxChannels: 10,
                startDate: "",
                endDate: "",
            },
            callinghours: {
                start: "09:00",
                end: "18:00",
            },
            minRatio: 1,
            maxRatio: 1,
            ratio: 1,
            retryStrategy: "Sequential",
                retryrules: {
                    NO_ANSWER: {
                        enabled: true,
                        intervalsminutes: "",
                    },
                },
            },
    });

    const [errors, setErrors] = useState({});



    useEffect(() => {
        getEditData(editId);
        getMemberGroups();
        getPhoneNumberGroup();
        getFrom();

    }, [editId]);
    useEffect(() => {
        if (editdata && Object.keys(editdata).length > 0) {
            let parsedRules = {
                limits: {
                    maxtotalattempts: 0,
                    maxattemptsper_day: 0,
                    maxChannels: 10,
                    startDate: "",
                    endDate: "",
                },
                callinghours: {
                    start: "09:00",
                    end: "18:00",
                },
                minRatio: 1,
                maxRatio: 1,
                Strategy: "STATIC",
                wrapupInterval: 30,
                retryrules: {
                    NO_ANSWER: {
                        enabled: true,
                        intervalsminutes: [],
                    },
                },
            };

            if (editdata.campaignRules) {
                try {
                    const rules = typeof editdata.campaignRules === 'string'
                        ? JSON.parse(editdata.campaignRules)
                        : editdata.campaignRules;

                    if (rules) {
                        // Deep merge to ensure all nested structures exist
                        parsedRules = {
                            ...parsedRules,
                            Strategy: rules.Strategy || "STATIC",
                            wrapupInterval: rules.wrapupInterval || 30,
                            minRatio: rules.minRatio || rules.ratio || 1,
                            maxRatio: rules.maxRatio || rules.ratio || 1,
                            ratio: rules.ratio || 1,
                            limits: { ...parsedRules.limits, ...(rules.limits || {}) },
                            callinghours: { ...parsedRules.callinghours, ...(rules.callinghours || {}) },
                            retryrules: {
                                ...parsedRules.retryrules,
                                ...(rules.retryrules || {}),
                                NO_ANSWER: {
                                    ...parsedRules.retryrules.NO_ANSWER,
                                    ...(rules.retryrules?.NO_ANSWER || {})
                                },
                            }
                        };

                        // specific handling to convert array back to string for input
                        if (parsedRules.retryrules?.NO_ANSWER?.intervalsminutes && Array.isArray(parsedRules.retryrules.NO_ANSWER.intervalsminutes)) {
                            parsedRules.retryrules.NO_ANSWER.intervalsminutes = parsedRules.retryrules.NO_ANSWER.intervalsminutes.join(", ");
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse campaign rules", e);
                }
            }

            setFormData({
                Name: editdata.campaignName || "",
                memberids: editdata.memberGroupIds || [],
                groupId: editdata.didGroupId || "",
                formId: editdata.formId || "",
                dialerType: editdata.dialerType || "MANUAL",
                campaignRules: parsedRules,
            });
        }
    }, [editdata]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        console.log(value)
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const validateField = (name, value) => {
        if (
            (!value || (Array.isArray(value) && value.length === 0)) &&
            name !== "formId"
        ) {
            return `${name} is required`;
        }
        return "";
    };

    const validateRules = (currentData, currentErrors = {}) => {
        const newErrors = { ...currentErrors };

        if (currentData.dialerType === "PREDICTIVE") {
            const maxAttempts = Number(currentData.campaignRules?.limits?.maxattemptsper_day || 0);
            const maxTotalAttempts = Number(currentData.campaignRules?.limits?.maxtotalattempts || 0);
            const requiredIntervals = maxAttempts > 0 ? maxAttempts - 1 : 0;

            // Max Attempts Validation
            if (maxAttempts > maxTotalAttempts) {
                newErrors.maxattemptsper_day = "Value must be less than Total Attempts";
            } else {
                delete newErrors.maxattemptsper_day;
            }

            // Date Order Validation
            const startDate = currentData.campaignRules.limits?.startDate;
            const endDate = currentData.campaignRules.limits?.endDate;
            if (startDate && endDate) {
                if (new Date(endDate) < new Date(startDate)) {
                    newErrors.dateOrder = "End Date must be after Start Date";
                } else {
                    delete newErrors.dateOrder;
                }
            }

            // Time Order Validation
            const startTime = currentData.campaignRules.callinghours?.start;
            const endTime = currentData.campaignRules.callinghours?.end;
            if (startTime && endTime) {
                const start = new Date(`1970-01-01T${startTime}`);
                const end = new Date(`1970-01-01T${endTime}`);
                if (end <= start) {
                    newErrors.timeOrder = "End Time must be after Start Time";
                } else {
                    delete newErrors.timeOrder;
                }
            }

            // Helper to parse intervals
            const getIntervalCount = (val) => {
                if (Array.isArray(val)) return val.length;
                if (typeof val === 'string') {
                    return val.split(",").map(v => v.trim()).filter(v => v !== "" && !isNaN(Number(v))).length;
                }
                return 0;
            };

            // NO_ANSWER Intervals Validation
            if (currentData.campaignRules.retryrules?.NO_ANSWER?.enabled) {
                const count = getIntervalCount(currentData.campaignRules.retryrules.NO_ANSWER.intervalsminutes);
                if (requiredIntervals > 0) {
                    if (count !== 1 && count !== requiredIntervals) {
                        newErrors.no_answer_intervals = `Provide either 1 common interval or ${requiredIntervals} specific intervals (e.g. "30" or "10, 20, 30")`;
                    } else {
                        delete newErrors.no_answer_intervals;
                    }
                } else if (count > 0) {
                    newErrors.no_answer_intervals = "Max Attempts is 1, so no retry intervals are needed.";
                } else {
                    delete newErrors.no_answer_intervals;
                }
            }
        }
        return newErrors;
    };

    const handleRatioChange = (value) => {
        setFormData((prev) => ({
            ...prev,
            campaignRules: {
                ...prev.campaignRules,
                ratio: value === "" ? "" : Number(value),
            },
        }));
    };

    const handleMinRatioChange = (value) => {
        setFormData((prev) => ({
            ...prev,
            campaignRules: {
                ...prev.campaignRules,
                minRatio: value === "" ? "" : Number(value),
            },
        }));
    };

    const handleMaxRatioChange = (value) => {
        setFormData((prev) => ({
            ...prev,
            campaignRules: {
                ...prev.campaignRules,
                maxRatio: value === "" ? "" : Number(value),
            },
        }));
    };

    const handleNestedChange = (section, field, value) => {
        setFormData((prev) => {
            const newData = {
                ...prev,
                campaignRules: {
                    ...prev.campaignRules,
                    [section]: {
                        ...prev.campaignRules[section],
                        [field]: (field === "startDate" || field === "endDate") ? value : (isNaN(Number(value)) ? value : Number(value)),
                    },
                },
            };
            setErrors((prevErrors) => validateRules(newData, prevErrors));
            return newData;
        });
    };


    const handleRetryRuleChange = (type, field, value) => {
        setFormData((prev) => ({
            ...prev,
            campaignRules: {
                ...prev.campaignRules,
                retryrules: {
                    ...prev.campaignRules.retryrules,
                    [type]: {
                        ...prev.campaignRules.retryrules[type],
                        [field]: value,
                    },
                },
            },
        }));
    };

    const handleIntervalsChange = (type, value) => {
        setFormData((prev) => {
            const newData = {
                ...prev,
                campaignRules: {
                    ...prev.campaignRules,
                    retryrules: {
                        ...prev.campaignRules.retryrules,
                        [type]: {
                            ...prev.campaignRules.retryrules[type],
                            intervalsminutes: value,
                        },
                    },
                },
            };
            setErrors((prevErrors) => validateRules(newData, prevErrors));
            return newData;
        });
    };

    const timeStringToDate = (timeStr) => {
        if (!timeStr) return new Date();
        const [hours, minutes] = timeStr.split(":").map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    const dateToTimeString = (date) => {
        if (!date) return "00:00";
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    };

    const handleSingleTimeChange = (field, { value }) => {
        setFormData((prev) => ({
            ...prev,
            campaignRules: {
                ...prev.campaignRules,
                callinghours: {
                    ...prev.campaignRules.callinghours,
                    [field]: dateToTimeString(value),
                },
            },
        }));
    };

    const handleStrategyChange = (value) => {
        setFormData((prev) => ({
            ...prev,
            campaignRules: {
                ...prev.campaignRules,
                Strategy: value,
            },
        }));
    };

    const handleWrapupChange = (value) => {
        setFormData((prev) => ({
            ...prev,
            campaignRules: {
                ...prev.campaignRules,
                wrapupInterval: value === "" ? "" : Number(value),
            },
        }));
    };

    const handleDateChange = (field, { value }) => {
        setFormData((prev) => ({
            ...prev,
            campaignRules: {
                ...prev.campaignRules,
                limits: {
                    ...prev.campaignRules.limits,
                    [field]: value ? formatDate(value) : "",
                },
            },
        }));
    };

    // Helper for dynamic placeholder
    const getIntervalPlaceholder = () => {
        if (!formData.campaignRules) return "e.g. 20, 30";
        const maxAttempts = Number(formData.campaignRules?.limits?.maxattemptsper_day || 0);
        const count = maxAttempts > 0 ? maxAttempts - 1 : 0;
        if (count <= 0) return "e.g. 20, 30";
        return Array.from({ length: count }, (_, i) => (i + 1) * 10).join(", ");
    };

    const getIntervalArray = (val, requiredCount) => {
        let arr = [];
        if (Array.isArray(val)) {
            arr = val;
        } else if (typeof val === 'string') {
            arr = val.split(",").map(v => v.trim()).filter(v => v !== "" && !isNaN(Number(v))).map(Number);
        }

        // If only one common interval is provided, repeat it
        if (arr.length === 1 && requiredCount > 1) {
            return Array(requiredCount).fill(arr[0]);
        }
        return arr.slice(0, requiredCount);
    };

    const handleSave = async () => {
        const newErrors = {};
        const fieldsToValidate = ["Name", "memberids", "groupId"];
        fieldsToValidate.forEach((key) => {
            const error = validateField(key, formData[key]);
            if (error) newErrors[key] = error;
        });

        const ruleErrors = validateRules(formData, newErrors);

        if (Object.keys(ruleErrors).length > 0) {
            setErrors(ruleErrors);
            return;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Deep copy and transform for payload
        const payloadData = JSON.parse(JSON.stringify(formData));
        if (payloadData.dialerType === "PREDICTIVE") {
            // Ensure ratio is not null
            if (payloadData.campaignRules.ratio === null || payloadData.campaignRules.ratio === undefined) {
                payloadData.campaignRules.ratio = payloadData.campaignRules.maxRatio || payloadData.campaignRules.minRatio || 1;
            }

            if (payloadData.campaignRules.retryrules?.NO_ANSWER) {
                const requiredCount = Number(payloadData.campaignRules.limits.maxattemptsper_day) - 1;
                payloadData.campaignRules.retryrules.NO_ANSWER.intervalsminutes = getIntervalArray(payloadData.campaignRules.retryrules.NO_ANSWER.intervalsminutes, requiredCount > 0 ? requiredCount : 0);
            }
        } else {
            // Clear campaign rules if dialer type is not predictive
            payloadData.campaignRules = {};
        }

        const payload = {
            id: editId,
            ...payloadData,
        };

        await submitedit(payload);
        navigate(-1);
    };

    const LabelWithInfo = ({ label, tooltip, htmlFor }) => (
        <div className="label_with_info">
            <label className="form_label" htmlFor={htmlFor}>{label}</label>
            <span className="info_trigger" data-tooltip={tooltip}>
                <Icon name="info" size={14} />
            </span>
        </div>
    );

    if (getEditDataLoading || getMemberGroupsLoading || getPhoneNumberGroupLoading || getFromLoading || editLoading) {
        return <Loader />;
    }

    return (
        <div className="admin_edit_campaign">
            {/* Navbar */}
            <div className="navbar_1">
                <div>
                    <p className="navbar_1_heading">Campaign</p>
                    <span className="navbar_1_breadcrumb">
                        <span
                            onClick={() => navigate("/admin-dashboard")}
                            className="navbar_1_breadcrumb_item"
                        >
                            Dashboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span
                            onClick={() =>
                                navigate("/admin-campaign?tab=campaign&page=1&per_page=10")
                            }
                            className="navbar_1_breadcrumb_item"
                        >
                            Campaign
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item active">
                            Edit Campaign
                        </span>
                    </span>
                </div>
            </div>

            {/* Form */}
            <div className="admin_edit_campaign_content">
                <div className="admin_edit_campaign_form_step">
                    {/* Name */}
                    <div className="admin_edit_campaign_list_container_modal_form_group">
                        <label className="form_label" htmlFor="Name">Name</label>
                        <Input
                            id="Name"
                            name="Name"
                            type="text"
                            value={formData.Name}
                            onChange={handleInputChange}
                            placeholder="Enter Campaign Name"
                        />
                        {errors.Name && <FormInputError message={errors.Name} />}
                    </div>

                    {/* Member Group (Multi Select) */}
                    <div className="admin_edit_campaign_list_container_modal_form_group">
                        <label className="form_label" htmlFor="memberids">Member Group</label>
                        <Select
                            id="memberids"
                            name="memberids"
                            mode="multiple"
                            wrapTags
                            placeholder="Select Members"
                            allowClear
                            showSearch
                            options={memberGroupData.map((m) => ({
                                label: m.m_membergroupName,
                                value: m.m_membergroupId,
                            }))}
                            value={formData.memberids}
                            style={{ width: "100%" }}
                            onChange={(value) => handleSelectChange("memberids", value)}
                        />
                        {errors.memberids && <FormInputError message={errors.memberids} />}
                    </div>

                    {/* Phone Number Group (Single Select) */}
                    <div className="admin_edit_campaign_list_container_modal_form_group">
                        <label className="form_label" htmlFor="groupId">Phone Number Group</label>
                        <Select
                            id="groupId"
                            name="groupId"
                            placeholder="Select Phone Number Group"
                            allowClear
                            showSearch
                            options={phoneNumberGroupData.map((d) => ({
                                label: d.group_name,
                                value: d.group_id,
                            }))}
                            value={formData.groupId}
                            style={{ width: "100%" }}
                            onChange={(value) => handleSelectChange("groupId", value)}
                        />
                        {errors.groupId && <FormInputError message={errors.groupId} />}
                    </div>

                    {/* Form (Single Select - Optional) */}
                    <div className="admin_edit_campaign_list_container_modal_form_group">
                        <label className="form_label" htmlFor="formId">Form</label>
                        <Select
                            id="formId"
                            name="formId"
                            placeholder="Select Form"
                            allowClear
                            showSearch
                            options={formDatas.map((f) => ({
                                label: f.f_formName,
                                value: f.f_formId,
                            }))}
                            value={formData.formId}
                            style={{ width: "100%" }}
                            onChange={(value) => handleSelectChange("formId", value)}
                        />
                    </div>

                    {/* Dialer Type */}
                    <div className="admin_edit_campaign_list_container_modal_form_group">
                        <label className="form_label" htmlFor="dialerType">Dialer Type</label>
                        <Select
                            id="dialerType"
                            name="dialerType"
                            placeholder="Select Dialer Type"
                            showSearch={false}
                            options={[
                                { label: "MANUAL", value: "MANUAL" },
                                { label: "PREDICTIVE", value: "PREDICTIVE" },
                            ]}
                            value={formData.dialerType}
                            style={{ width: "100%" }}
                            onChange={(value) => handleSelectChange("dialerType", value)}
                        />
                    </div>

                    {/* Campaign Rules (Predictive only) */}
                    {formData.dialerType === "PREDICTIVE" && (
                        <div className="admin_edit_campaign_campaign_rules">
                            <h3 className="form_section_heading">Campaign Rules</h3>

                            {/* Section 1: Schedule & Timing */}
                            <div className="campaign_rules_section">
                                <div className="section_title">
                                    <Icon name="calender" size={16} /> 📅 Schedule & Timing
                                </div>
                                <div className="section_grid">
                                    <div className="admin_edit_campaign_list_container_modal_form_group">
                                        <LabelWithInfo 
                                            label="Start Date" 
                                            tooltip="The date when the campaign will start placing calls."
                                        />
                                        <DateTimeRangePicker
                                            type="single"
                                            showTime={false}
                                            showDate={true}
                                            initialStart={formData.campaignRules.limits.startDate ? new Date(formData.campaignRules.limits.startDate) : new Date()}
                                            onChange={(val) => handleDateChange("startDate", val)}
                                        />
                                    </div>

                                    <div className="admin_edit_campaign_list_container_modal_form_group">
                                        <LabelWithInfo 
                                            label="End Date" 
                                            tooltip="The date when the campaign will automatically stop."
                                        />
                                        <DateTimeRangePicker
                                            type="single"
                                            showTime={false}
                                            showDate={true}
                                            initialStart={formData.campaignRules.limits.endDate ? new Date(formData.campaignRules.limits.endDate) : new Date()}
                                            onChange={(val) => handleDateChange("endDate", val)}
                                        />
                                        {errors.dateOrder && <FormInputError message={errors.dateOrder} />}
                                    </div>

                                    <div className="admin_edit_campaign_list_container_modal_form_group">
                                        <LabelWithInfo 
                                            label="Start Time" 
                                            tooltip="Daily time to start dialing (e.g. 09:00 AM)."
                                        />
                                        <DateTimeRangePicker
                                            type="single"
                                            showTime={true}
                                            showDate={false}
                                            initialStart={timeStringToDate(formData.campaignRules.callinghours.start)}
                                            onChange={(val) => handleSingleTimeChange("start", val)}
                                        />
                                    </div>
                                    <div className="admin_edit_campaign_list_container_modal_form_group">
                                        <LabelWithInfo 
                                            label="End Time" 
                                            tooltip="Daily time to stop dialing (e.g. 06:00 PM)."
                                        />
                                        <DateTimeRangePicker
                                            type="single"
                                            showTime={true}
                                            showDate={false}
                                            initialStart={timeStringToDate(formData.campaignRules.callinghours.end)}
                                            onChange={(val) => handleSingleTimeChange("end", val)}
                                        />
                                        {errors.timeOrder && <FormInputError message={errors.timeOrder} />}
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Capacity & Retries */}
                            <div className="campaign_rules_section">
                                <div className="section_title">
                                    <Icon name="ring" size={16} /> ⚙️ Capacity & Retries
                                </div>
                                <div className="section_grid">
                                    <div className="admin_edit_campaign_list_container_modal_form_group">
                                        <LabelWithInfo 
                                            label="Max Total Retry" 
                                            tooltip="Total number of times a lead can be dialed in its lifetime."
                                            htmlFor="maxtotalattempts"
                                        />
                                        <Input
                                            id="maxtotalattempts"
                                            name="maxtotalattempts"
                                            type="number"
                                            value={formData.campaignRules.limits.maxtotalattempts}
                                            onChange={(e) => handleNestedChange("limits", "maxtotalattempts", e.target.value)}
                                            placeholder="Enter Max Retry"
                                        />
                                    </div>

                                    <div className="admin_edit_campaign_list_container_modal_form_group">
                                        <LabelWithInfo 
                                            label="Max Retry Per Day" 
                                            tooltip="Maximum dial attempts allowed per lead in a single day."
                                            htmlFor="maxattemptsper_day"
                                        />
                                        <Input
                                            id="maxattemptsper_day"
                                            name="maxattemptsper_day"
                                            type="number"
                                            value={formData.campaignRules.limits.maxattemptsper_day}
                                            onChange={(e) => handleNestedChange("limits", "maxattemptsper_day", e.target.value)}
                                            placeholder="Enter Max Retry Per Day"
                                        />
                                        {errors.maxattemptsper_day && <FormInputError message={errors.maxattemptsper_day} />}
                                    </div>

                                    <div className="admin_edit_campaign_list_container_modal_form_group">
                                        <LabelWithInfo 
                                            label="Max Channels" 
                                            tooltip="Maximum concurrent calls allowed for this campaign."
                                            htmlFor="maxChannels"
                                        />
                                        <Input
                                            id="maxChannels"
                                            name="maxChannels"
                                            type="number"
                                            value={formData.campaignRules.limits.maxChannels}
                                            onChange={(e) => handleNestedChange("limits", "maxChannels", e.target.value)}
                                            placeholder="Enter Max Channels"
                                        />
                                    </div>

                                    <div className="admin_edit_campaign_list_container_modal_form_group">
                                        <LabelWithInfo 
                                            label="Retry Interval (mins)" 
                                            tooltip="Wait time between retries for 'No Answer' leads."
                                            htmlFor="no_answer_retry"
                                        />
                                        <Input
                                            id="no_answer_retry"
                                            value={formData.campaignRules.retryrules.NO_ANSWER.intervalsminutes}
                                            onChange={(e) => handleIntervalsChange("NO_ANSWER", e.target.value)}
                                            placeholder={getIntervalPlaceholder()}
                                        />
                                        {errors.no_answer_intervals && <FormInputError message={errors.no_answer_intervals} />}
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Dialer Logic */}
                            <div className="campaign_rules_section">
                                <div className="section_title">
                                    <Icon name="prediction" size={16} /> 🚀 Dialer Configuration
                                </div>
                                <div className="section_grid">
                                    <div className="admin_edit_campaign_list_container_modal_form_group">
                                        <LabelWithInfo 
                                            label="Default Dialing Ratio" 
                                            tooltip="Primary calls-to-agent ratio (e.g. 1 means 1 call per free agent)."
                                        />
                                        <Input
                                            type="number"
                                            min={1}
                                            max={20}
                                            value={formData.campaignRules.ratio}
                                            onChange={(e) => handleRatioChange(e.target.value)}
                                            placeholder="Default Ratio"
                                        />
                                    </div>
                                    <div className="admin_edit_campaign_list_container_modal_form_group">
                                        <LabelWithInfo 
                                            label="Min Dialing Ratio" 
                                            tooltip="The lowest ratio the adaptive engine can dial."
                                        />
                                        <Input
                                            type="number"
                                            min={1}
                                            max={20}
                                            value={formData.campaignRules.minRatio}
                                            onChange={(e) => handleMinRatioChange(e.target.value)}
                                            placeholder="Min Ratio"
                                        />
                                    </div>
                                    <div className="admin_edit_campaign_list_container_modal_form_group">
                                        <LabelWithInfo 
                                            label="Max Dialing Ratio" 
                                            tooltip="The highest ratio the adaptive engine can dial."
                                        />
                                        <Input
                                            type="number"
                                            min={1}
                                            max={20}
                                            value={formData.campaignRules.maxRatio}
                                            onChange={(e) => handleMaxRatioChange(e.target.value)}
                                            placeholder="Max Ratio"
                                        />
                                    </div>

                                    <div className="admin_edit_campaign_list_container_modal_form_group">
                                        <LabelWithInfo 
                                            label="Dialing Strategy" 
                                            tooltip="Static uses fixed ratio; Adaptive adjusts based on answer rates."
                                        />
                                        <Select
                                            placeholder="Select Strategy"
                                            options={[
                                                { label: "STATIC", value: "STATIC" },
                                                { label: "ADAPTIVE", value: "ADAPTIVE" },
                                            ]}
                                            value={formData.campaignRules.Strategy}
                                            style={{ width: "100%" }}
                                            onChange={(value) => handleStrategyChange(value)}
                                        />
                                    </div>
                                    <div className="admin_edit_campaign_list_container_modal_form_group">
                                        <LabelWithInfo 
                                            label="Wrapup Interval (secs)" 
                                            tooltip="Cooldown time granted to agents between calls."
                                        />
                                        <Input
                                            type="number"
                                            min={0}
                                            max={3600}
                                            value={formData.campaignRules.wrapupInterval}
                                            onChange={(e) => handleWrapupChange(e.target.value)}
                                            placeholder="Wrapup Interval"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Buttons */}
                <div className="admin_edit_campaign_list_form_footer">
                    <Button onClick={() => navigate(-1)} variant="secondary">Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </div>
            </div>
        </div>
    );
};

export default AdminCampaignEdit;
