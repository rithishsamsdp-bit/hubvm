import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmergencyStore } from '../../../store/admin/useEmergencyStore';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import Select from '../../../components/Select';
import Icon from '../../../constants/Icon.jsx';
import Switch from '../../../components/Switch';
import Checkbox from '../../../components/Checkbox';
import Modal from '../../../components/Modal';
import Radio from '../../../components/Radio';
import DateTimeRangePicker from '../../../components/DateTimeRangePicker';
import './styles/AdminEmergencyCreate.css';

const POLLY_LANGUAGES = [
    { label: "US English", value: "en-US" },
    { label: "British English", value: "en-GB" },
    { label: "Indian English", value: "en-IN" },
    { label: "Hindi", value: "hi-IN" },
    { label: "Tamil", value: "ta-IN" },
    { label: "Telugu", value: "te-IN" }
];

const POLLY_VOICES = {
    "en-US": [{ label: "Joanna (Female)", value: "Joanna" }, { label: "Matthew (Male)", value: "Matthew" }, { label: "Kendra (Female)", value: "Kendra" }],
    "en-GB": [{ label: "Amy (Female)", value: "Amy" }, { label: "Brian (Male)", value: "Brian" }],
    "en-IN": [{ label: "Aditi (Female)", value: "Aditi" }, { label: "Raveena (Female)", value: "Raveena" }],
    "hi-IN": [{ label: "Aditi (Female)", value: "Aditi" }, { label: "Kajal (Female)", value: "Kajal" }],
    "ta-IN": [{ label: "Kani (Female)", value: "Kani" }],
    "te-IN": [{ label: "Shruti (Female)", value: "Shruti" }]
};

const AdminEmergencyCreate = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);

    const [formData, setFormData] = useState({
        name: '',
        priority: 'MEDIUM',
        category: 'GENERAL',
        language: 'ENGLISH',
        interactionMode: 'ANNOUNCEMENT', // 'ANNOUNCEMENT' or 'INTERACTIVE'
        audienceType: "CSV", // CSV or GROUP
        selectedGroupId: "",
        contactsFile: null,
        strategy: 'SEQUENTIAL',
        scheduleType: 'IMMEDIATE',
        scheduleTime: '',
        retryLogic: {
            enabled: false,
            maxRetries: 1,
            retryInterval: 5
        },
        sequentialConfig: {
            ivrToWaDelay: 5,
            waToSmsDelay: 5
        },
        strategyFlow: [
            {
                id: Math.random().toString(),
                channels: ['IVR'],
                waitDuration: 0,
                triggers: {
                    IVR: { noAnswer: true, busy: true, invalidInput: true },
                    WA: { delivered: false, read: false, failed: true, timeout: 10, noResponse: true },
                    SMS: { failed: true, notDelivered: true }
                },
                action: 'NEXT', // 'NEXT', 'RETRY', 'STOP'
                retryCount: 1,
                retryDelay: 5,
                executionMode: 'PARALLEL', // 'PARALLEL', 'STAGGERED'
                interChannelDelay: 2,
                stopStageOnSuccess: true,
                ivrConfig: {
                    type: 'FLOW', // 'FLOW' or 'TTS'
                    flowId: '',
                    cliNumberId: '',
                    ttsContent: '',
                    ttsLanguage: 'en-US',
                    ttsVoice: 'Joanna'
                },
                waConfig: {
                    templateId: '',
                    buttonReplies: {}
                },
                smsConfig: {
                    content: '',
                    templateId: ''
                }
            }
        ]
    });

    const { templates, fetchTemplates, isLoadingTemplates, groups, fetchGroups, isLoadingGroups, callFlows, fetchCallFlows, cliNumbers, fetchCliNumbers, smsTemplates, fetchSmsTemplates, createGroup, createEmergencyCampaign } = useEmergencyStore();
    const [isLaunching, setIsLaunching] = useState(false);
    const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
    const [isEditingGroup, setIsEditingGroup] = useState(false);
    const [editingGroupId, setEditingGroupId] = useState(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [contacts, setContacts] = useState([]); // Array of { name, phone }
    const [currentPage, setCurrentPage] = useState(1);
    const [manualContact, setManualContact] = useState({ name: "", phone: "" });
    const [selectedTemplateData, setSelectedTemplateData] = useState(null);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [parsedCsvContacts, setParsedCsvContacts] = useState([]); // Added for Campaign CSV audience

    useEffect(() => {
        fetchTemplates();
        fetchGroups();
        fetchCallFlows();
        fetchCliNumbers();
        fetchSmsTemplates();
    }, []);

    const getActiveTemplate = (templateId) => {
        return templates.find(t => t.templateId === templateId);
    };

    const stepLabels = [
        { id: 1, title: "Core Campaign", subtitle: "Priority & Category", icon: "alert" },
        { id: 2, title: "Audience", subtitle: "Target Recipients", icon: "groups" },
        { id: 3, title: "Sequence Flow", subtitle: "Flow Mapping", icon: "automation" },
        { id: 4, title: "Overview", subtitle: "Deployment Logic", icon: "sent" },
        { id: 5, title: "Launch Pad", subtitle: "Review & Test", icon: "success_icon" }
    ];

    const formatDate = (date) => {
        if (!date) return null;
        return new Date(date).toISOString().split('.')[0] + 'Z';
    };

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleLaunch = async () => {
        if (!formData.name.trim()) {
            toast.error("Please enter a campaign name");
            return;
        }

        setIsLaunching(true);
        try {
            let effectiveGroupId = formData.selectedGroupId;

            // Handle CSV Upload by creating an automated group
            if (formData.audienceType === 'CSV') {
                if (parsedCsvContacts.length === 0) {
                    toast.error("Please upload a valid CSV file with contacts");
                    setIsLaunching(false);
                    return;
                }

                const groupResponse = await createGroup({
                    name: `Campaign CSV - ${formData.name} - ${new Date().toLocaleTimeString()}`,
                    contacts: parsedCsvContacts
                });

                if (groupResponse && groupResponse.group_id) {
                    effectiveGroupId = groupResponse.group_id;
                } else {
                    toast.error("Failed to create temporary group for CSV contacts");
                    setIsLaunching(false);
                    return;
                }
            }

            const payload = {
                e_campaignName: formData.name,
                e_priority: formData.priority,
                e_category: formData.category,
                e_primaryLanguage: formData.language,
                e_interactionMode: formData.interactionMode,
                e_scheduleType: formData.scheduleType,
                e_scheduleTime: formData.scheduleType === 'SCHEDULED' ? formatDate(formData.scheduleTime) : null,
                e_orchestrationData: {
                    audience: {
                        type: "GROUP", // Convert to GROUP for orchestration consistency
                        groupId: effectiveGroupId,
                        fileName: formData.contactsFile?.name
                    },
                    stages: formData.strategyFlow.map(block => ({
                        channels: block.channels,
                        waitDuration: Math.max(0, parseInt(block.waitDuration || 0)),
                        triggers: block.triggers,
                        action: block.action,
                        retryCount: Math.max(0, parseInt(block.retryCount || 0)),
                        retryDelay: Math.max(0, parseInt(block.retryDelay || 0)),
                        executionMode: block.executionMode,
                        interChannelDelay: Math.max(0, parseInt(block.interChannelDelay || 0)),
                        stopStageOnSuccess: block.stopStageOnSuccess,
                        config: {
                            ivr: block.ivrConfig,
                            wa: block.waConfig,
                            sms: block.smsConfig
                        }
                    }))
                }
            };

            const success = await createEmergencyCampaign(payload);
            if (success) {
                navigate("/admin-emergency", { state: { activeTab: 'Alerts' } });
                toast.success(formData.scheduleType === 'IMMEDIATE' ? "Emergency campaign launched!" : "Campaign scheduled successfully");

            }
        } catch (error) {
            console.error("Launch error:", error);
        } finally {
            setIsLaunching(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFormData(prev => ({ ...prev, contactsFile: file }));

        // Parse CSV for leads
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split("\n").filter(line => line.trim() !== "");
            const parsedContacts = lines.slice(1).map(line => {
                const parts = line.split(",").map(part => part.trim());
                return {
                    name: parts[0] || "Unknown",
                    phone: parts[1] || ""
                };
            }).filter(c => c.phone);

            setParsedCsvContacts(parsedContacts);
            toast.info(`Parsed ${parsedContacts.length} contacts from CSV`);
        };
        reader.readAsText(file);
    };

    const downloadSampleCSV = () => {
        const csvContent = "data:text/csv;charset=utf-8,Name,Phone\nJohn Doe,919876543210\nJane Smith,919876543211";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "emergency_contacts_sample.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            toast.error("Please enter a group name");
            return;
        }
        if (contacts.length === 0) {
            toast.error("Please add at least one contact");
            return;
        }
        const success = await createGroup({
            name: newGroupName,
            contacts: contacts,
            contactCount: contacts.length
        });
        if (success) {
            handleCloseGroupModal();
            fetchGroups();
        }
    };

    const handleUpdateGroup = async () => {
        if (!newGroupName.trim()) {
            toast.error("Please enter a group name");
            return;
        }
        if (contacts.length === 0) {
            toast.error("Please add at least one contact");
            return;
        }
        const success = await useEmergencyStore.getState().updateGroup(editingGroupId, {
            name: newGroupName,
            contacts: contacts
        });
        if (success) {
            handleCloseGroupModal();
            fetchGroups();
        }
    };

    const handleCloseGroupModal = () => {
        setCreateGroupModalOpen(false);
        setIsEditingGroup(false);
        setEditingGroupId(null);
        setNewGroupName('');
        setContacts([]);
        setCurrentPage(1);
    };

    const handleOpenEditGroup = async (group) => {
        setIsEditingGroup(true);
        setEditingGroupId(group.id);
        setNewGroupName(group.name);

        // Fetch actual contacts for the group
        const groupContacts = await useEmergencyStore.getState().fetchGroupContacts(group.id);
        setContacts(groupContacts.map(c => ({ ...c, id: Math.random().toString() })));

        setCreateGroupModalOpen(true);
    };

    const handleGroupCsvUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split("\n");
            const newContacts = lines.slice(1).map(line => {
                const [name, phone] = line.split(",").map(item => item?.trim());
                if (name && phone) return { name, phone, id: Math.random().toString() };
                return null;
            }).filter(Boolean);

            setContacts(prev => [...prev, ...newContacts]);
            setCurrentPage(1); // Reset to first page on upload
            toast.success(`Imported ${newContacts.length} contacts`);
        };
        reader.readAsText(file);
    };

    const addManualContact = () => {
        setContacts(prev => [...prev, { name: "", phone: "", id: Math.random().toString() }]);
    };

    const updateContact = (id, field, value) => {
        setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const removeContact = (id) => {
        setContacts(prev => prev.filter(c => c.id !== id));
        // Icon name will be 'deletee' in JSX
    };

    const addOrchestrationBlock = () => {
        setFormData(prev => ({
            ...prev,
            strategyFlow: [
                ...prev.strategyFlow,
                {
                    id: Math.random().toString(),
                    channels: [],
                    waitDuration: 5,
                    triggers: {
                        IVR: { noAnswer: true, busy: true, invalidInput: true },
                        WA: { delivered: false, read: false, failed: true, timeout: 10, noResponse: true },
                        SMS: { failed: true, notDelivered: true }
                    },
                    action: 'NEXT',
                    retryCount: 1,
                    retryDelay: 5,
                    executionMode: 'PARALLEL',
                    interChannelDelay: 2,
                    stopStageOnSuccess: true,
                    ivrConfig: {
                        type: 'FLOW',
                        flowId: '',
                        ttsContent: ''
                    },
                    waConfig: {
                        templateId: '',
                        buttonReplies: {}
                    },
                    smsConfig: {
                        content: '',
                        templateId: ''
                    }
                }
            ]
        }));
    };

    const removeOrchestrationBlock = (id) => {
        setFormData(prev => ({
            ...prev,
            strategyFlow: prev.strategyFlow.filter(b => b.id !== id)
        }));
    };

    const updateBlock = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            strategyFlow: prev.strategyFlow.map(b => b.id === id ? { ...b, [field]: value } : b)
        }));
    };

    const toggleChannel = (blockId, channel) => {
        setFormData(prev => ({
            ...prev,
            strategyFlow: prev.strategyFlow.map(b => {
                if (b.id === blockId) {
                    const channels = b.channels.includes(channel)
                        ? b.channels.filter(c => c !== channel)
                        : [...b.channels, channel];
                    return { ...b, channels };
                }
                return b;
            })
        }));
    };

    const renderStep1 = () => (
        <React.Fragment>
            <h2 className="admin_emergency_step_title">Core Campaign</h2>
            <p className="admin_emergency_step_desc">Specify the nature and urgency of this emergency alert.</p>

            <div className="admin_emergency_step_grid">
                <div className="meta_input_group">
                    <label className="form_label">Campaign Name</label>
                    <Input
                        placeholder="campaign name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                </div>
                <div className="meta_input_group">
                    <label className="form_label">Campaign Priority</label>
                    <Select
                        options={[
                            { label: "High", value: 'HIGH' },
                            { label: "Medium", value: 'MEDIUM' },
                            { label: "Low", value: 'LOW' }
                        ]}
                        showSearch={false}
                        value={formData.priority}
                        onChange={(val) => setFormData(prev => ({ ...prev, priority: val }))}
                    />
                </div>
                <div className="meta_input_group">
                    <label className="form_label">Alert Category</label>
                    <Select
                        options={[
                            { label: "General", value: 'GENERAL' },
                            { label: "Security", value: 'SECURITY' },
                            { label: "Maintenance", value: 'MAINTENANCE' },
                            { label: "Broadcast", value: 'BROADCAST' }
                        ]}
                        value={formData.category}
                        showSearch={false}
                        onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                    />
                </div>
                <div className="meta_input_group">
                    <label className="form_label">Primary Language</label>
                    <Select
                        options={[
                            { label: "English", value: 'ENGLISH' },
                            { label: "Tamil", value: 'TAMIL' },
                            { label: "Hindi", value: 'HINDI' }
                        ]}
                        showSearch={false}
                        value={formData.language}
                        onChange={(val) => setFormData(prev => ({ ...prev, language: val }))}
                    />
                </div>
                <div className="meta_input_group">
                    <label className="form_label">Interaction Mode</label>
                    <Select
                        options={[
                            { label: "Announcement Only (One-way)", value: 'ANNOUNCEMENT' },
                            { label: "Interactive Session (Two-way)", value: 'INTERACTIVE' }
                        ]}
                        showSearch={false}
                        value={formData.interactionMode}
                        onChange={(val) => setFormData(prev => ({ ...prev, interactionMode: val }))}
                    />
                </div>
            </div>
        </React.Fragment>
    );

    const renderStep2 = () => (
        <React.Fragment>
            <h2 className="admin_emergency_step_title">Audience</h2>
            <p className="admin_emergency_step_desc">Choose how you want to provide your list of recipients.</p>

            <div className="admin_emergency_form_group">
                <label className="form_label">Distribution Method</label>
                <div className="admin_emergency_toggle_row">
                    <button
                        className={`toggle_btn ${formData.audienceType === 'CSV' ? 'active' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, audienceType: 'CSV' }))}
                    >
                        <Icon name="upload" size={14} /> CSV Upload
                    </button>
                    <button
                        className={`toggle_btn ${formData.audienceType === 'GROUP' ? 'active' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, audienceType: 'GROUP' }))}
                    >
                        <Icon name="groups" size={14} /> Saved Group
                    </button>
                </div>
            </div>

            {formData.audienceType === 'CSV' ? (
                <div className="admin_emergency_form_group" style={{ marginTop: '24px' }}>
                    <div className="admin_emergency_label_row">
                        <label className="form_label">Recipients List (CSV/Excel)</label>
                    </div>

                    <div className="admin_emergency_upload_box" onClick={() => document.getElementById("fileInput").click()}>
                        <input type="file" id="fileInput" hidden onChange={handleFileUpload} />
                        <Icon name="upload" size={32} color="#ff5200" />
                        <span>{formData.contactsFile ? formData.contactsFile.name : "Drop contacts file here or click to browse"}</span>
                    </div>
                    <button type="button" className="download_sample_link" onClick={downloadSampleCSV}>
                        <Icon name="download" size={12} /> Download Sample Format (CSV)
                    </button>
                </div>
            ) : (
                <div className="admin_emergency_form_group" style={{ marginTop: '24px' }}>
                    <div className="admin_emergency_label_row">
                        <label className="form_label">Select Contact Group</label>
                    </div>
                    <Select
                        placeholder={isLoadingGroups ? "Loading groups..." : "Select a group"}
                        options={groups.map(g => ({ label: `${g.name} (${g.contactCount} contacts)`, value: g.id }))}
                        value={formData.selectedGroupId}
                        showSearch={false}
                        onChange={(val) => setFormData(prev => ({ ...prev, selectedGroupId: val }))}
                    />
                </div>
            )}
        </React.Fragment>
    );

    const renderStep3 = () => (
        <React.Fragment>
            <div className="admin_emergency_step_header_row">
                <div>
                    <h2 className="admin_emergency_step_title">Sequence Flow</h2>
                    <p className="admin_emergency_step_desc">Design your blast sequence. Add blocks for sequential or parallel deployment.</p>
                </div>
            </div>

            <div className="orchestration_flow_container">
                {formData.strategyFlow.map((block, index) => (
                    <div key={block.id} className="orchestration_card">
                        <div className="orchestration_card_header">
                            <div className="block_number">Stage {index + 1}</div>
                            {formData.strategyFlow.length > 1 && (
                                <Button variant="empty" onClick={() => removeOrchestrationBlock(block.id)}>
                                    <Icon name="deletee" size={16} color="#ef4444" />
                                </Button>
                            )}
                        </div>

                        <div className="orchestration_card_body">
                            <div className="channel_picker_section">
                                <label className="form_label_small">Deployment Channels</label>
                                <div className="channel_chips">
                                    {['IVR', 'WA', 'SMS'].map(ch => (
                                        <button
                                            key={ch}
                                            className={`channel_chip ${block.channels.includes(ch) ? 'active' : ''}`}
                                            onClick={() => toggleChannel(block.id, ch)}
                                        >
                                            <Icon name={ch === 'IVR' ? 'alert' : (ch === 'WA' ? 'whatsapp' : 'sms')} size={18} />
                                            {ch}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {block.channels.length > 1 && (
                                <div className="execution_mode_section">
                                    <label className="form_label_small">Stage Execution Type</label>
                                    <div className="admin_emergency_toggle_row">
                                        <button
                                            className={`toggle_btn ${block.executionMode === 'PARALLEL' ? 'active' : ''}`}
                                            onClick={() => updateBlock(block.id, 'executionMode', 'PARALLEL')}
                                        >
                                            <Icon name="automation" size={14} /> Simultaneous (Parallel)
                                        </button>
                                        <button
                                            className={`toggle_btn ${block.executionMode === 'STAGGERED' ? 'active' : ''}`}
                                            onClick={() => updateBlock(block.id, 'executionMode', 'STAGGERED')}
                                        >
                                            <Icon name="timer" size={14} /> Interval-based (Staggered)
                                        </button>
                                    </div>
                                    {block.executionMode === 'STAGGERED' && (
                                        <div className="stagger_config_row" style={{ marginTop: '12px' }}>
                                            <Input
                                                type="number"
                                                value={block.interChannelDelay}
                                                onChange={(e) => updateBlock(block.id, 'interChannelDelay', e.target.value)}
                                                placeholder="2"
                                                style={{ width: '80px' }}
                                            />
                                            <span>minutes interval between channels</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="trigger_logic_section">
                                <label className="form_label_small">Trigger Condition & Action</label>
                                <div className="trigger_action_layout">
                                    <div className="trigger_grid_compact">
                                        {block.channels.includes('IVR') && (
                                            <div className="trigger_group">
                                                <div className="trigger_title"><Icon name="alert" size={14} /> IVR Fails</div>
                                                <Checkbox
                                                    options={[
                                                        { label: "No Answer", value: 'noAnswer' },
                                                        { label: "Busy", value: 'busy' },
                                                        { label: "Invalid Input", value: 'invalidInput' }
                                                    ]}
                                                    selected={[
                                                        ...(block.triggers.IVR.noAnswer ? ['noAnswer'] : []),
                                                        ...(block.triggers.IVR.busy ? ['busy'] : []),
                                                        ...(block.triggers.IVR.invalidInput ? ['invalidInput'] : [])
                                                    ]}
                                                    onChange={(selected) => updateBlock(block.id, 'triggers', {
                                                        ...block.triggers,
                                                        IVR: {
                                                            ...block.triggers.IVR,
                                                            noAnswer: selected.includes('noAnswer'),
                                                            busy: selected.includes('busy'),
                                                            invalidInput: selected.includes('invalidInput')
                                                        }
                                                    })}
                                                    direction="horizontal"
                                                />
                                            </div>
                                        )}
                                        {block.channels.includes('WA') && (
                                            <div className="trigger_group">
                                                <div className="trigger_title"><Icon name="whatsapp" size={14} /> WA Status</div>
                                                <Checkbox
                                                    options={[
                                                        { label: "No Response", value: 'noResponse' },
                                                        { label: "Not Read", value: 'unread' },
                                                        { label: "If Failed", value: 'failed' }
                                                    ]}
                                                    selected={[
                                                        ...(block.triggers.WA.noResponse ? ['noResponse'] : []),
                                                        ...(block.triggers.WA.read === false ? ['unread'] : []),
                                                        ...(block.triggers.WA.failed ? ['failed'] : [])
                                                    ]}
                                                    onChange={(selected) => updateBlock(block.id, 'triggers', {
                                                        ...block.triggers,
                                                        WA: {
                                                            ...block.triggers.WA,
                                                            noResponse: selected.includes('noResponse'),
                                                            read: !selected.includes('unread'),
                                                            failed: selected.includes('failed')
                                                        }
                                                    })}
                                                    direction="horizontal"
                                                />
                                                {block.triggers.WA.noResponse && (
                                                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <label className="form_label_small" style={{ marginBottom: 0 }}>If No Response in (Mins):</label>
                                                        <div style={{ width: '80px' }}>
                                                            <Input
                                                                type="number"
                                                                size="small"
                                                                value={block.triggers.WA.timeout || 10}
                                                                onChange={(e) => updateBlock(block.id, 'triggers', {
                                                                    ...block.triggers,
                                                                    WA: {
                                                                        ...block.triggers.WA,
                                                                        timeout: parseInt(e.target.value) || 1
                                                                    }
                                                                })}
                                                                placeholder="10"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {block.channels.includes('SMS') && (
                                            <div className="trigger_group">
                                                <div className="trigger_title"><Icon name="sms" size={14} /> SMS Status</div>
                                                <Checkbox
                                                    options={[
                                                        { label: "Failed", value: 'failed' },
                                                        { label: "Not Delivered", value: 'notDelivered' }
                                                    ]}
                                                    selected={[
                                                        ...(block.triggers.SMS.failed ? ['failed'] : []),
                                                        ...(block.triggers.SMS.notDelivered ? ['notDelivered'] : [])
                                                    ]}
                                                    onChange={(selected) => updateBlock(block.id, 'triggers', {
                                                        ...block.triggers,
                                                        SMS: {
                                                            ...block.triggers.SMS,
                                                            failed: selected.includes('failed'),
                                                            notDelivered: selected.includes('notDelivered')
                                                        }
                                                    })}
                                                    direction="horizontal"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="action_selector_box">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label className="form_label_small">Then Perform Action:</label>
                                            <Select
                                                options={[
                                                    { label: "Move to Next Stage", value: 'NEXT' },
                                                    { label: "Retry Current Stage", value: 'RETRY' },
                                                    { label: "Stop for this Contact", value: 'STOP' }
                                                ]}
                                                showSearch={false}
                                                value={block.action}
                                                onChange={(val) => updateBlock(block.id, 'action', val)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {block.action === 'RETRY' && (
                                    <div style={{ display: 'flex', gap: '16px', marginTop: '16px', padding: '16px', backgroundColor: '#fdf2f2', borderRadius: '10px', border: '1px solid #fee2e2' }}>
                                        <div style={{ flex: 1 }}>
                                            <label className="form_label_small" style={{ marginBottom: '8px', display: 'block' }}>Maximum Retry Attempts</label>
                                            <Input
                                                type="number"
                                                value={block.retryCount}
                                                onChange={(e) => updateBlock(block.id, 'retryCount', e.target.value)}
                                                placeholder="1"
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label className="form_label_small" style={{ marginBottom: '8px', display: 'block' }}>Retry Interval (Minutes Delay)</label>
                                            <Input
                                                type="number"
                                                value={block.retryDelay}
                                                onChange={(e) => updateBlock(block.id, 'retryDelay', e.target.value)}
                                                placeholder="5"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="advanced_stage_settings">
                                <label className="form_label_small">Advanced Stage Options</label>
                                <div className="settings_grid">
                                    {index > 0 && (
                                        <div className="setting_item">
                                            <div className="setting_info">
                                                <span className="setting_title">Pre-stage Delay</span>
                                                <span className="setting_desc">Wait before this stage starts</span>
                                            </div>
                                            <div className="delay_input_compact">
                                                <Input
                                                    type="number"
                                                    value={block.waitDuration}
                                                    onChange={(e) => updateBlock(block.id, 'waitDuration', e.target.value)}
                                                    placeholder="0"
                                                />
                                                <span>mins</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="setting_item">
                                        <div className="setting_info">
                                            <span className="setting_title">Success Acknowledge Logic</span>
                                            <span className="setting_desc">Stop other channels in this stage if one succeeds</span>
                                        </div>
                                        <Switch
                                            checked={block.stopStageOnSuccess}
                                            onChange={(val) => updateBlock(block.id, 'stopStageOnSuccess', val)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Channel Specific Content - Moved from Step 4 */}
                            {block.channels.length > 0 && (
                                <div className="stage_content_config_area" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed #e2e8f0' }}>
                                    <label className="form_label_small" style={{ marginBottom: '16px', display: 'block' }}>Channel Content Configuration</label>

                                    <div className="stage_content_grid" style={{ display: 'grid', gridTemplateColumns: block.channels.length > 1 ? '1fr 1fr' : '1fr', gap: '20px' }}>
                                        {block.channels.includes('IVR') && (
                                            <div className="stage_content_card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                    <Icon name="alert" size={20} color="#ff5200" />
                                                    <span style={{ fontWeight: 600, fontSize: '13px' }}>IVR Content</span>
                                                </div>
                                                <div className="ivr_switch_container" style={{ marginBottom: '16px', display: 'flex', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '8px', position: 'relative' }}>
                                                    <div
                                                        className="ivr_switch_slider"
                                                        style={{
                                                            position: 'absolute', top: '4px', bottom: '4px', left: '4px', width: 'calc(25% - 4px)', backgroundColor: '#fff', borderRadius: '6px',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.3s ease',
                                                            transform: `translateX(${block.ivrConfig.type === 'AUDIO' ? '0' : block.ivrConfig.type === 'TTS' ? '100%' : block.ivrConfig.type === 'FLOW' ? '200%' : '300%'})`
                                                        }}
                                                    />
                                                    <button
                                                        style={{ flex: 1, position: 'relative', zIndex: 1, padding: '8px 0', border: 'none', background: 'transparent', fontSize: '11px', fontWeight: block.ivrConfig.type === 'AUDIO' ? 600 : 500, color: block.ivrConfig.type === 'AUDIO' ? '#ff5200' : '#64748b', cursor: 'pointer', transition: 'color 0.3s ease' }}
                                                        onClick={(e) => { e.preventDefault(); updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, type: 'AUDIO' }); }}
                                                    >
                                                        Audio
                                                    </button>
                                                    <button
                                                        style={{ flex: 1, position: 'relative', zIndex: 1, padding: '8px 0', border: 'none', background: 'transparent', fontSize: '11px', fontWeight: block.ivrConfig.type === 'TTS' ? 600 : 500, color: block.ivrConfig.type === 'TTS' ? '#ff5200' : '#64748b', cursor: 'pointer', transition: 'color 0.3s ease' }}
                                                        onClick={(e) => { e.preventDefault(); updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, type: 'TTS' }); }}
                                                    >
                                                        AI TTS
                                                    </button>
                                                    <button
                                                        style={{ flex: 1, position: 'relative', zIndex: 1, padding: '8px 0', border: 'none', background: 'transparent', fontSize: '11px', fontWeight: block.ivrConfig.type === 'FLOW' ? 600 : 500, color: block.ivrConfig.type === 'FLOW' ? '#ff5200' : '#64748b', cursor: 'pointer', transition: 'color 0.3s ease' }}
                                                        onClick={(e) => { e.preventDefault(); updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, type: 'FLOW' }); }}
                                                    >
                                                        Flow
                                                    </button>
                                                    <button
                                                        style={{ flex: 1, position: 'relative', zIndex: 1, padding: '8px 0', border: 'none', background: 'transparent', fontSize: '11px', fontWeight: block.ivrConfig.type === 'WA_TEMPLATE' ? 600 : 500, color: block.ivrConfig.type === 'WA_TEMPLATE' ? '#ff5200' : '#64748b', cursor: 'pointer', transition: 'color 0.3s ease' }}
                                                        onClick={(e) => { e.preventDefault(); updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, type: 'WA_TEMPLATE' }); }}
                                                    >
                                                        WA Template
                                                    </button>
                                                </div>

                                                <div style={{ marginBottom: '16px' }}>
                                                    <label className="form_label_small" style={{ marginBottom: '8px', display: 'block' }}>Outbound Caller ID (CLI)</label>
                                                    <Select
                                                        variant="minimal"
                                                        placeholder="Select Caller ID"
                                                        options={cliNumbers.map(cli => ({ label: `${cli.c_clinumberName} (${cli.c_clinumberCountryName || 'IN'})`, value: String(cli.c_clinumberId) }))}
                                                        value={block.ivrConfig.cliNumberId}
                                                        onChange={(val) => updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, cliNumberId: val })}
                                                    />
                                                </div>

                                                {block.ivrConfig.type === 'AUDIO' && (
                                                    <div className="file_upload_container" style={{ marginTop: '0', padding: '16px' }}>
                                                        <label className="file_upload_label" style={{ fontSize: '13px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                            <div className="upload_icon_circle" style={{ width: '40px', height: '40px', backgroundColor: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                                <Icon name={block.ivrConfig.isUploading ? "timer" : "upload"} size={20} color="#ff5200" />
                                                            </div>
                                                            <span className="upload_text_main" style={{ color: '#475569', fontWeight: 500 }}>
                                                                {block.ivrConfig.isUploading ? "Uploading..." : (block.ivrConfig.audioFileName || "Click to upload audio file (.wav, .mp3)")}
                                                            </span>
                                                            {block.ivrConfig.audioUrl && (
                                                                <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 500 }}>✓ Uploaded to S3</span>
                                                            )}
                                                            <input
                                                                type="file"
                                                                accept="audio/*"
                                                                style={{ display: 'none' }}
                                                                disabled={block.ivrConfig.isUploading}
                                                                onChange={async (e) => {
                                                                    if (e.target.files && e.target.files.length > 0) {
                                                                        const file = e.target.files[0];
                                                                        updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, audioFileName: file.name, isUploading: true });
                                                                        const result = await useEmergencyStore.getState().uploadAudio(file);
                                                                        if (result) {
                                                                            updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, audioFileName: result.fileName, audioUrl: result.audioUrl, isUploading: false });
                                                                        } else {
                                                                            updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, audioFileName: '', audioUrl: '', isUploading: false });
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                )}

                                                {block.ivrConfig.type === 'FLOW' && (
                                                    <Select
                                                        variant="minimal"
                                                        placeholder="Select Call Flow"
                                                        options={callFlows.map(cf => ({ label: cf.c_callflowName, value: String(cf.c_callflowId) }))}
                                                        value={block.ivrConfig.flowId}
                                                        onChange={(val) => updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, flowId: val })}
                                                    />
                                                )}

                                                {block.ivrConfig.type === 'TTS' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        <textarea
                                                            className="admin_emergency_textarea_minimal"
                                                            placeholder="TTS message..."
                                                            style={{ width: '100%', minHeight: '60px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '8px', fontSize: '12px', resize: 'vertical' }}
                                                            value={block.ivrConfig.ttsContent}
                                                            onChange={(e) => updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, ttsContent: e.target.value })}
                                                        />
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                                                            <Select
                                                                variant="minimal"
                                                                placeholder="Language"
                                                                options={POLLY_LANGUAGES}
                                                                value={block.ivrConfig.ttsLanguage || "en-US"}
                                                                onChange={(val) => updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, ttsLanguage: val, ttsVoice: POLLY_VOICES[val][0].value })}
                                                            />
                                                            <Select
                                                                variant="minimal"
                                                                placeholder="Voice"
                                                                options={POLLY_VOICES[block.ivrConfig.ttsLanguage || "en-US"]}
                                                                value={block.ivrConfig.ttsVoice || "Joanna"}
                                                                onChange={(val) => updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, ttsVoice: val })}
                                                            />
                                                            <Button
                                                                variant="secondary"
                                                                disabled={!block.ivrConfig.ttsContent || block.ivrConfig.isPreviewing}
                                                                onClick={async () => {
                                                                    if (!block.ivrConfig.ttsContent || block.ivrConfig.ttsContent.trim() === '') {
                                                                        toast.error("Please enter text for the TTS message before listening.");
                                                                        return;
                                                                    }
                                                                    updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, isPreviewing: true });
                                                                    const audioUrl = await useEmergencyStore.getState().previewTTS(
                                                                        block.ivrConfig.ttsContent,
                                                                        block.ivrConfig.ttsLanguage || "en-US",
                                                                        block.ivrConfig.ttsVoice || "Joanna"
                                                                    );
                                                                    updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, isPreviewing: false });
                                                                    if (audioUrl) {
                                                                        const audio = new Audio(audioUrl);
                                                                        audio.play();
                                                                    }
                                                                }}
                                                            >
                                                                <Icon name="headphone" size={14} />
                                                                {block.ivrConfig.isPreviewing ? "Loading..." : "Listen"}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                                {block.ivrConfig.type === 'WA_TEMPLATE' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        <Select
                                                            variant="minimal"
                                                            placeholder="Select WhatsApp Template"
                                                            options={templates.map(t => ({ label: t.templateName, value: t.templateId }))}
                                                            value={block.ivrConfig.waTemplateId}
                                                            onChange={(val) => {
                                                                const template = templates.find(t => t.templateId === val);
                                                                const bodyComponent = template?.templateStructure?.components?.find(c => c.type === 'BODY');
                                                                const text = bodyComponent?.text || '';
                                                                updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, waTemplateId: val, ttsContent: text });
                                                            }}
                                                        />
                                                        {block.ivrConfig.ttsContent && (
                                                            <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569', minHeight: '40px' }}>
                                                                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>Extracted Content for TTS:</div>
                                                                {block.ivrConfig.ttsContent}
                                                            </div>
                                                        )}
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                                                            <Select
                                                                variant="minimal"
                                                                placeholder="Language"
                                                                options={POLLY_LANGUAGES}
                                                                value={block.ivrConfig.ttsLanguage || "en-US"}
                                                                onChange={(val) => updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, ttsLanguage: val, ttsVoice: POLLY_VOICES[val][0].value })}
                                                            />
                                                            <Select
                                                                variant="minimal"
                                                                placeholder="Voice"
                                                                options={POLLY_VOICES[block.ivrConfig.ttsLanguage || "en-US"]}
                                                                value={block.ivrConfig.ttsVoice || "Joanna"}
                                                                onChange={(val) => updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, ttsVoice: val })}
                                                            />
                                                            <Button
                                                                variant="secondary"
                                                                disabled={!block.ivrConfig.ttsContent || block.ivrConfig.isPreviewing}
                                                                onClick={async () => {
                                                                    updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, isPreviewing: true });
                                                                    const audioUrl = await useEmergencyStore.getState().previewTTS(
                                                                        block.ivrConfig.ttsContent,
                                                                        block.ivrConfig.ttsLanguage || "en-US",
                                                                        block.ivrConfig.ttsVoice || "Joanna"
                                                                    );
                                                                    updateBlock(block.id, 'ivrConfig', { ...block.ivrConfig, isPreviewing: false });
                                                                    if (audioUrl) {
                                                                        const audio = new Audio(audioUrl);
                                                                        audio.play();
                                                                    }
                                                                }}
                                                            >
                                                                <Icon name="headphone" size={14} />
                                                                {block.ivrConfig.isPreviewing ? "Loading..." : "Listen"}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {block.channels.includes('WA') && (
                                            <div className="stage_content_card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                    <Icon name="whatsapp" size={20} color="#ff5200" />
                                                    <span style={{ fontWeight: 600, fontSize: '13px' }}>WA Message</span>
                                                </div>
                                                <Select
                                                    variant="minimal"
                                                    placeholder="Select Template"
                                                    options={templates.map(t => ({ label: t.templateName, value: t.templateId }))}
                                                    value={block.waConfig.templateId}
                                                    onChange={(val) => updateBlock(block.id, 'waConfig', { ...block.waConfig, templateId: val })}
                                                />
                                                {block.waConfig.templateId && (
                                                    <div style={{ marginTop: '12px' }}>
                                                        <div style={{ transform: 'scale(0.85)', transformOrigin: 'top left' }}>
                                                            {renderTemplatePreview(getActiveTemplate(block.waConfig.templateId))}
                                                        </div>
                                                        {(() => {
                                                            const template = getActiveTemplate(block.waConfig.templateId);
                                                            const buttonsComp = template?.templateStructure?.components?.find(c => c.type === 'BUTTONS');
                                                            if (buttonsComp && buttonsComp.buttons && buttonsComp.buttons.length > 0) {
                                                                return (
                                                                    <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                                            <Icon name="reply" size={16} color="#00a884" />
                                                                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>Configure Button Replies</span>
                                                                        </div>
                                                                        {buttonsComp.buttons.map((btn, bIdx) => (
                                                                            <div key={bIdx} style={{ marginBottom: '12px' }}>
                                                                                <label className="form_label_small" style={{ display: 'block', marginBottom: '6px', color: '#64748b', fontSize: '11px' }}>
                                                                                    When user clicks: <b style={{ color: '#00a884' }}>"{btn.text}"</b>
                                                                                </label>
                                                                                <textarea
                                                                                    className="admin_emergency_textarea_minimal"
                                                                                    placeholder={`Auto-reply for "${btn.text}"...`}
                                                                                    style={{ width: '100%', minHeight: '50px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '8px', fontSize: '12px', resize: 'vertical' }}
                                                                                    value={block.waConfig.buttonReplies?.[btn.text] || ''}
                                                                                    onChange={(e) => {
                                                                                        const newReplies = { ...(block.waConfig.buttonReplies || {}), [btn.text]: e.target.value };
                                                                                        updateBlock(block.id, 'waConfig', { ...block.waConfig, buttonReplies: newReplies });
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {block.channels.includes('SMS') && (
                                            <div className="stage_content_card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', gridColumn: block.channels.length === 3 ? 'span 2' : 'auto' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                    <Icon name="sms" size={20} color="#ff5200" />
                                                    <span style={{ fontWeight: 600, fontSize: '13px' }}>SMS Template</span>
                                                </div>
                                                <Select
                                                    variant="minimal"
                                                    placeholder="Select Whitelisted Template"
                                                    options={smsTemplates.map(t => ({ label: `${t.templateName} (${t.sender})`, value: String(t.templateId) }))}
                                                    value={block.smsConfig.templateId}
                                                    onChange={(val) => {
                                                        const template = smsTemplates.find(t => String(t.templateId) === val);
                                                        updateBlock(block.id, 'smsConfig', {
                                                            ...block.smsConfig,
                                                            templateId: val,
                                                            content: template?.templateMessage || '',
                                                            sender: template?.sender,
                                                            dltTemplateId: template?.dltTemplateId,
                                                            dltEntityId: template?.dltEntityId
                                                        });
                                                    }}
                                                />
                                                {block.smsConfig.content && (
                                                    <div style={{ marginTop: '12px', backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569' }}>
                                                        <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>Preview:</div>
                                                        <div style={{ lineHeight: '1.5' }}>{block.smsConfig.content}</div>
                                                        {block.smsConfig.content.includes('{#var#}') && (
                                                            <div style={{ marginTop: '8px', padding: '6px 8px', backgroundColor: '#eff6ff', borderRadius: '4px', border: '1px solid #bfdbfe', fontSize: '11px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <Icon name="info" size={14} color="#3b82f6" />
                                                                <span>Variable <code>{'{#var#}'}</code> will be replaced with the contact's <b>Name</b>.</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {index < formData.strategyFlow.length - 1 && (
                            <div className="flow_connector">
                                <Icon name="rightarrow" size={12} style={{ transform: 'rotate(90deg)' }} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </React.Fragment>
    );

    const renderStep4 = () => {
        const selectedChannels = new Set(formData.strategyFlow.flatMap(b => b.channels));

        return (
            <React.Fragment>
                <div className="admin_emergency_step_header_row">
                    <div>
                        <h2 className="admin_emergency_step_title">Overview</h2>
                        <p className="admin_emergency_step_desc">Visual representation of your emergency broadcast sequence.</p>
                    </div>
                </div>

                <div className="orchestration_visualizer_box">
                    <div className="visualizer_stage_row">
                        {formData.strategyFlow.map((stage, idx) => (
                            <React.Fragment key={stage.id}>
                                <div className="visual_stage_node">
                                    <div className="node_header">
                                        <div className="node_idx">Stage {idx + 1}</div>
                                    </div>
                                    <div className="node_channels">
                                        {stage.channels.map(ch => (
                                            <div key={ch} className="channel_detail_group">
                                                <div className="mini_channel_badge">
                                                    <Icon name={ch === 'IVR' ? 'campaign' : (ch === 'WA' ? 'whatsapp' : 'sms')} size={14} />
                                                    <span>{ch}</span>
                                                </div>
                                                <div className="trigger_details">
                                                    {Object.entries(stage.triggers[ch] || {}).map(([key, val]) => {
                                                        if (val === true) {
                                                            let label = key;
                                                            if (key === 'noAnswer') label = "No Answer";
                                                            if (key === 'invalidInput') label = "Invalid Input";
                                                            if (key === 'noResponse') label = "No Response";
                                                            if (key === 'notDelivered') label = "Not Delivered";
                                                            return <span key={key} className="trigger_tag">{label}</span>;
                                                        }
                                                        if (key === 'read' && val === false) return <span key={key} className="trigger_tag">Not Read</span>;
                                                        if (key === 'timeout' && stage.triggers[ch].noResponse) {
                                                            return <span key={key} className="trigger_tag timeout">Timeout: {val}m</span>;
                                                        }
                                                        return null;
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="node_action_ribbon">
                                        {stage.action === 'RETRY' ? (
                                            <div className="action_retry_info">
                                                <span className="action_retry">Retry Stage</span>
                                                <div className="retry_params">
                                                    <span>Max: {stage.retryCount}</span>
                                                    <span>Delay: {stage.retryDelay}m</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className={stage.action === 'NEXT' ? 'action_next' : 'action_stop'}>
                                                {stage.action === 'NEXT' ? 'Proceed to Next' : 'End Flow'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {idx < formData.strategyFlow.length - 1 && (
                                    <div className="visual_connector_line">
                                        {formData.strategyFlow[idx + 1].waitDuration > 0 && (
                                            <div className="connector_label">
                                                <div className="label_val"><Icon name="timer" size={10} /> {formData.strategyFlow[idx + 1].waitDuration}m</div>
                                                <div className="label_text">Delay</div>
                                            </div>
                                        )}
                                        <div className="connector_arrow"><Icon name="rightarrow" size={12} /></div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="orchestration_meta_options" style={{ marginTop: '40px' }}>
                    <div className="admin_emergency_option_card" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0' }}>
                        <div className="option_header">
                            <Icon name="timer" size={20} color="#ff5200" />
                            <span style={{ fontSize: '1rem', fontWeight: 800 }}>Global Deployment Setup</span>
                        </div>
                        <div className="option_content_row">
                            <div className="meta_field">
                                <label>Broadcast Timing</label>
                                <Select
                                    options={[
                                        { label: "Immediate (Now)", value: "IMMEDIATE" },
                                        { label: "Scheduled for later", value: "SCHEDULED" }
                                    ]}
                                    showSearch={false}
                                    value={formData.scheduleType}
                                    onChange={(val) => setFormData(prev => ({ ...prev, scheduleType: val }))}
                                />
                            </div>
                            {formData.scheduleType === 'SCHEDULED' && (
                                <div className="meta_field">
                                    <label>Pick Date & Time</label>
                                    <DateTimeRangePicker
                                        type="single"
                                        showTime={true}
                                        initialStart={formData.scheduleTime ? new Date(formData.scheduleTime) : new Date()}
                                        onChange={({ value }) => setFormData(prev => ({ ...prev, scheduleTime: value }))}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </React.Fragment>
        );
    };

    const renderTemplatePreview = (template) => {
        if (!template || !template.templateStructure) return null;

        const body = template.templateStructure.components.find(c => c.type === 'BODY');
        const footer = template.templateStructure.components.find(c => c.type === 'FOOTER');
        const buttons = template.templateStructure.components.find(c => c.type === 'BUTTONS');

        return (
            <div className="wa_preview_container">
                <div className="wa_chat_bubble">
                    {body && (
                        <div className="wa_body">
                            {body.text.split('\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {line}
                                    <br />
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                    {footer && (
                        <div className="wa_footer">
                            {footer.text}
                        </div>
                    )}
                </div>
                {buttons && buttons.buttons && (
                    <div className="wa_buttons_container">
                        {buttons.buttons.map((btn, idx) => (
                            <div key={idx} className="wa_preview_btn">
                                <Icon name="reply" size={14} color="#00a884" />
                                <span>{btn.text}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderStep5 = () => (
        <React.Fragment>
            <h2 className="admin_emergency_step_title">Launch Pad</h2>
            <p className="admin_emergency_step_desc">Final review before broadcasting the emergency alert.</p>

            <div className="admin_emergency_review_card">
                <div className="admin_emergency_review_grid">
                    <div className="admin_emergency_review_item">
                        <label>Campaign</label>
                        <span>{formData.name || "UNNAMED"}</span>
                    </div>
                    <div className="admin_emergency_review_item">
                        <label>Priority</label>
                        <span className={`priority_${formData.priority.toLowerCase()}`}>{formData.priority}</span>
                    </div>
                    <div className="admin_emergency_review_item">
                        <label>Target</label>
                        <span>{formData.audienceType === 'CSV'
                            ? (formData.contactsFile ? formData.contactsFile.name : "NO LIST")
                            : (groups.find(g => g.id === formData.selectedGroupId)?.name || "NO GROUP")}</span>
                    </div>
                </div>
                <div className="admin_emergency_review_stages_summary" style={{ marginTop: '24px', borderTop: '1px solid rgba(255, 82, 0, 0.1)', paddingTop: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#1e293b' }}>Sequence Config Summary</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {formData.strategyFlow.map((stage, idx) => (
                            <div key={stage.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                <div style={{ minWidth: '60px', fontWeight: 600, color: '#ff5200', fontSize: '12px' }}>Stage {idx + 1}</div>
                                <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                                    {stage.channels.includes('IVR') && (
                                        <div style={{ fontSize: '12px' }}>
                                            <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', marginBottom: '2px' }}>IVR</div>
                                            <div style={{ color: '#1e293b' }}>{stage.ivrConfig.type === 'FLOW' ? 'Recorded Flow' : (stage.ivrConfig.type === 'WA_TEMPLATE' ? 'WA Template TTS' : 'TTS Message')}</div>
                                        </div>
                                    )}
                                    {stage.channels.includes('WA') && (
                                        <div style={{ fontSize: '12px' }}>
                                            <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', marginBottom: '2px' }}>WhatsApp</div>
                                            <div style={{ color: '#1e293b' }}>{getActiveTemplate(stage.waConfig.templateId)?.templateName || 'No Template'}</div>
                                        </div>
                                    )}
                                    {stage.channels.includes('SMS') && (
                                        <div style={{ fontSize: '12px' }}>
                                            <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', marginBottom: '2px' }}>SMS</div>
                                            <div style={{ color: '#1e293b' }}>{smsTemplates.find(t => String(t.templateId) === stage.smsConfig.templateId)?.templateName || (stage.smsConfig.content ? 'Configured' : 'No Template')}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Modal
                open={previewModalOpen}
                onClose={() => setPreviewModalOpen(false)}
                width="400px"
            >
                <div className="template_preview_modal_content">
                    <div className="modal_header_simple">
                        <h3>WhatsApp Preview</h3>
                        <Button variant="empty" onClick={() => setPreviewModalOpen(false)}>
                            <Icon name="close" size={20} />
                        </Button>
                    </div>
                    <div className="modal_body_simple">
                        <p className="template_name_tag">Template: <strong>{selectedTemplateData?.templateName}</strong></p>
                        {renderTemplatePreview(selectedTemplateData)}
                    </div>
                </div>
            </Modal>
        </React.Fragment>
    );

    return (
        <div className="admin_emergency_create_page_root">
            <div className="navbar_1">
                <div className="navbar_1_left">
                    <p className="navbar_1_heading">Emergency</p>
                    <span className="navbar_1_breadcrumb">
                        <span onClick={() => navigate("/admin-dashboard")} className="navbar_1_breadcrumb_item">Dashboard</span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span onClick={() => navigate("/admin-emergency")} className="navbar_1_breadcrumb_item">Emergency</span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item active">Campaign creation</span>
                    </span>
                </div>
            </div>

            <div className="admin_emergency_launch_center">
                {/* Vertical Stepper Sidebar */}
                <div className="admin_emergency_sidebar_stepper">
                    <div className="stepper_header">
                        <h3>Campaign creation</h3>
                        <p>Steps to progress</p>
                    </div>
                    <div className="stepper_items_container">
                        {stepLabels.map(step => (
                            <div
                                key={step.id}
                                className={`stepper_item ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
                                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                            >
                                <div className="stepper_icon_box">
                                    <Icon
                                        name={step.icon}
                                        size={18}
                                        color={currentStep > step.id ? "#ffffff" : (currentStep === step.id ? "#ff5200" : "#94a3b8")}
                                    />
                                </div>
                                <div className="stepper_text">
                                    <h4>{step.title}</h4>
                                    <p>{step.subtitle}</p>
                                </div>
                                {currentStep > step.id && <div className="completed_check"><Icon name="success_icon" size={12} color="#fff" /></div>}
                            </div>
                        ))}
                    </div>
                    <div className="stepper_footer">
                        <div className="pulse_visual">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                </div>

                {/* Form Area */}
                <div className="admin_emergency_main_launch_area">
                    <div className="step_content_wrapper">
                        <div className="admin_emergency_form_step">
                            <div className="admin_emergency_step_body">
                                {currentStep === 1 && renderStep1()}
                                {currentStep === 2 && renderStep2()}
                                {currentStep === 3 && renderStep3()}
                                {currentStep === 4 && renderStep4()}
                                {currentStep === 5 && renderStep5()}
                            </div>

                            <div className="admin_emergency_launch_footer">
                                <div className="footer_left">
                                    {currentStep === 3 && (
                                        <Button variant="secondary" onClick={addOrchestrationBlock}>
                                            <Icon name="plus" size={14} /> Add Sequence Block
                                        </Button>
                                    )}
                                </div>
                                <div className="footer_right">
                                    <Button variant="secondary" onClick={currentStep === 1 ? () => navigate(-1) : prevStep}>
                                        {currentStep === 1 ? "Exit" : "Previous"}
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={currentStep === 5 ? handleLaunch : nextStep}
                                        isLoading={currentStep === 5 && isLaunching}
                                        disabled={currentStep === 5 && isLaunching}
                                    >
                                        {currentStep === 5 ? "Launch" : "Next"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                open={createGroupModalOpen}
                onClose={handleCloseGroupModal}
                width="800px"
            >
                <div className="admin_emergency_modal_content">
                    <div className="modal_header_simple">
                        <h3>{isEditingGroup ? "View/Edit Group" : "Create New Group"}</h3>
                        <Button variant="empty" onClick={handleCloseGroupModal}>
                            <Icon name="close" size={20} />
                        </Button>
                    </div>

                    <div className="modal_meta_row">
                        <div className="meta_input_group meta_group_name">
                            {isEditingGroup ? (
                                <h1 className="modal_group_heading">{newGroupName}</h1>
                            ) : (
                                <>
                                    <label className="form_label">Group Name</label>
                                    <Input
                                        placeholder="e.g. On-site Security"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                    />
                                </>
                            )}
                        </div>
                        {!isEditingGroup && (
                            <div className="meta_input_group meta_csv_upload_area">
                                <label className="form_label">Import CSV</label>
                                <div className="modal_csv_upload" onClick={() => document.getElementById("shortcutCsvInput").click()}>
                                    <input type="file" id="shortcutCsvInput" hidden accept=".csv" onChange={handleGroupCsvUpload} />
                                    <Icon name="upload" size={18} color="#ff5200" />
                                    <span>Click to upload contact list (CSV)</span>
                                </div>
                                <button className="download_sample_link" onClick={downloadSampleCSV}>
                                    <Icon name="download" size={12} /> Download Sample Format
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="modal_table_container">
                        <table className="modal_contact_table">
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>#</th>
                                    <th>Contact Name</th>
                                    <th style={{ width: '250px' }}>Phone Number</th>
                                    <th style={{ width: '80px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contacts.length > 0 ? (
                                    contacts.slice((currentPage - 1) * 10, currentPage * 10).map((contact, index) => (
                                        <tr key={contact.id}>
                                            <td>{(currentPage - 1) * 10 + index + 1}</td>
                                            <td>
                                                <input
                                                    className="table_input_minimal"
                                                    placeholder="Enter name"
                                                    value={contact.name}
                                                    onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    className="table_input_minimal"
                                                    placeholder="e.g. 919876543210"
                                                    value={contact.phone}
                                                    onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <Button variant="empty" onClick={() => removeContact(contact.id)}>
                                                    <Icon name="deletee" size={14} color="#ef4444" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="no_contacts_empty">
                                            No contacts yet. Import a CSV or add manually.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {contacts.length > 10 && (
                            <div className="modal_pagination_footer">
                                <div className="pagination_info">
                                    Showing {(currentPage - 1) * 10 + 1} - {Math.min(currentPage * 10, contacts.length)} of {contacts.length}
                                </div>
                                <button
                                    className="page_btn"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                >
                                    <Icon name="leftarrow" size={12} />
                                </button>
                                {Array.from({ length: Math.ceil(contacts.length / 10) }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        className={`page_btn ${currentPage === page ? 'active' : ''}`}
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    className="page_btn"
                                    disabled={currentPage === Math.ceil(contacts.length / 10)}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                >
                                    <Icon name="rightarrow" size={12} />
                                </button>
                            </div>
                        )}
                        <button className="table_add_row_btn" onClick={addManualContact}>
                            <Icon name="plus" size={14} /> Add New Contact Row
                        </button>
                    </div>

                    <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                        <Button variant="secondary" onClick={handleCloseGroupModal} style={{ flex: 1 }}>Cancel</Button>
                        <Button variant="primary" onClick={isEditingGroup ? handleUpdateGroup : handleCreateGroup} style={{ flex: 1 }}>
                            {isEditingGroup ? "Save Changes" : "Create Group"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdminEmergencyCreate;
