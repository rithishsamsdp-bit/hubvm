import React, { useState } from 'react';
import './style/Onboard.css';
import { Button, message, Steps, Input, Form, InputNumber, Radio, Switch, Select } from 'antd';
import authaxios from '../../functions/authaxios.js';

const steps = [
    { title: 'Company Details', content: 'Company Details Content' },
    { title: 'Menu Selection', content: 'Company Settings Content' },
    { title: 'Integrations', content: 'Company Settings Content' },
];

const Onboard = () => {
    const [current, setCurrent] = useState(0);
    const [form] = Form.useForm();

    const [usersEnabled, setUsersEnabled] = useState(false);
    const [queueEnabled, setQueueEnabled] = useState(false);
    const [reportEnabled, setReportEnabled] = useState(false);
    const [settingsEnabled, setSettingsEnabled] = useState(false);
    const [ivrblastEnabled, setIvrblastEnabled] = useState(false);
    const [ApiIntegrationEnabled, setApiIntegrationEnabled] = useState(false);
    const [CrmIntegrationEnabled, setCrmIntegrationEnabled] = useState(false);
    const [WhatsappIntegrationEnabled, setWhatsappIntegrationEnabled] = useState(false);
    const [AgentPanelEnabled, setAgentPanelEnabled] = useState(false);


    // Single state to handle all form fields
    const [formData, setFormData] = useState({
        companyName: '',
        companyStrength: '',
        mobile: '',
        email: '',
        description: '',
        dialmode: 'manual',
        agentCount: 1,
        adminCount: 1,
        tlCount: 1,
        superAdminCount: 1,
        queueCount: 1,
        SkillListCount: 1,
        BlockListCount: 1,
        CarrierCount: 1,
        DispositionCount: 1,
        CallflowCount: 1,
        BusinessHolidayCount: 1,
        IvrblastCampaignCount: 1,
        IvrblastCarrierCount: 1,
        IvrblastIvrflowCount: 1,
        IvrblastCreationCount: 1,
        IvrblastdashboardEnabled: ''
    });




    const next = () => {
        form
            .validateFields()
            .then(() => {
                setCurrent(current + 1);
            })
            .catch((info) => {
                console.log('Validate Failed:', info);
            });
    };

    const prev = () => setCurrent(current - 1);

    const items = steps.map((item) => ({
        key: item.title,
        title: item.title,
    }));

    // Generic change handler for form inputs
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSwitchChange = (type, checked) => {
        switch (type) {
            case 'users':
                setUsersEnabled(checked);
                if (!checked) {
                    form.resetFields(['agentCount', 'adminCount', 'tlCount', 'superAdminCount']);
                    setFormData((prevData) => ({
                        ...prevData,
                        agentCount: 1,
                        adminCount: 1,
                        tlCount: 1,
                        superAdminCount: 1,
                    }));
                }
                break;
            case 'queue':
                setQueueEnabled(checked);
                if (!checked) {
                    setFormData((prevData) => ({
                        ...prevData,
                        queueCount: 1,
                    }));
                }
                break;
            case 'report':
                setReportEnabled(checked);
                if (!checked) {
                    setFormData((prevData) => ({
                        ...prevData,
                        reports: [],
                    }));
                }
                break;
            case 'settings':
                setSettingsEnabled(checked);
                if (!checked) {
                    setFormData((prevData) => ({
                        ...prevData,
                        SkillListCount: 1,
                        BlockListCount: 1,
                        CarrierCount: 1,
                        DispositionCount: 1,
                        CallflowCount: 1,
                        BusinessHolidayCount: 1,
                    }));
                }
                break;
            case 'ivrblast':
                setIvrblastEnabled(checked);
                if (!checked) {
                    setFormData((prevData) => ({
                        ...prevData,
                        IvrblastCampaignCount: 1,
                        IvrblastdashboardEnabled: ''
                    }));

                }
                break;
            case 'ApiIntegrationEnabled':
                setApiIntegrationEnabled(checked);
                // if (!checked) {
                //     setFormData((prevData) => ({
                //         ...prevData,
                //         IvrblastCampaignCount: 1,
                //         IvrblastdashboardEnabled: ''
                //     }));

                // }
                break;
            case 'CrmIntegrationEnabled':
                setCrmIntegrationEnabled(checked);
                // if (!checked) {
                //     setFormData((prevData) => ({
                //         ...prevData,
                //         IvrblastCampaignCount: 1,
                //         IvrblastdashboardEnabled: ''
                //     }));

                // }
                break;
            case 'WhatsappIntegrationEnabled':
                setWhatsappIntegrationEnabled(checked);
                // if (!checked) {
                //     setFormData((prevData) => ({
                //         ...prevData,
                //         IvrblastCampaignCount: 1,
                //         IvrblastdashboardEnabled: ''
                //     }));

                // }
                break;
            case 'AgentPanelEnabled':
                setAgentPanelEnabled(checked);
                // if (!checked) {
                //     setFormData((prevData) => ({
                //         ...prevData,
                //         IvrblastCampaignCount: 1,
                //         IvrblastdashboardEnabled: ''
                //     }));

                // }
                break;
            default:
                break;
        }
    };

    const apicall = () => {

        const res = authaxios.post('/custonboard/custonboard');
        console.log(res.data);
        message.success('Processing complete!')
    }


    const usersFields = [
        { name: "Agent Count", key: "agentCount" },
        { name: "Admin Count", key: "adminCount" },
        { name: "Tl Count", key: "tlCount" },
        { name: "SuperAdmin Count", key: "superAdminCount" }
    ];

    return (
        <div className="Onboard_container">
            <div className="Onboard_left_container">
                <Steps current={current} items={items} direction="vertical" />
            </div>
            <div className="Onboard_right_container">
                {current === 0 && (
                    <div className="Onboard_company_details_container">
                        <Form form={form} layout="vertical">
                            <div className="Onboard_company_details_container_form_spliter">
                                <Form.Item
                                    label="Company Name"
                                    name="companyName"
                                    rules={[{ required: true, message: 'Please enter your company name' }]}
                                >
                                    <Input
                                        style={{ width: 300 }}
                                        name="companyName"
                                        value={formData.companyName}
                                        onChange={handleInputChange}
                                    />
                                </Form.Item>
                                <Form.Item
                                    label="Company Strength"
                                    name="companyStrength"
                                    rules={[
                                        { required: true, message: 'Please input the company strength!' },
                                        { pattern: /^[0-9]+$/, message: 'Strength must be a number!' },
                                    ]}
                                >
                                    <InputNumber
                                        style={{ width: 300 }}
                                        min={1}
                                        name="companyStrength"
                                        value={formData.companyStrength}
                                        onChange={(value) => setFormData({ ...formData, companyStrength: value })}
                                    />
                                </Form.Item>
                            </div>

                            <div className="Onboard_company_details_container_form_spliter">
                                <Form.Item
                                    label="Mobile Number"
                                    name="mobile"
                                    rules={[
                                        { required: true, message: 'Please enter a mobile number' },
                                        { pattern: /^[0-9]*$/, message: 'Mobile Number must contain only numbers' },
                                    ]}
                                >
                                    <Input
                                        style={{ width: 300 }}
                                        name="mobile"
                                        type="tel"
                                        value={formData.mobile}
                                        onChange={handleInputChange}
                                    />
                                </Form.Item>
                                <Form.Item
                                    label="Email"
                                    name="email"
                                    rules={[{ required: true, type: 'email', message: 'Please enter a valid email address' }]}
                                >
                                    <Input
                                        style={{ width: 300 }}
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                    />
                                </Form.Item>
                            </div>

                            <Form.Item label="Description" name="description">
                                <Input.TextArea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                />
                            </Form.Item>
                        </Form>
                    </div>
                )}

                {current === 1 && (
                    <div className="Onboard_menu_details_container">
                        <Form initialValues={{
                            dialmode: 'manual', // Default value for Dial Mode
                        }} form={form}>
                            <Form.Item
                                label="Dial Mode"
                                name="dialmode"
                                rules={[{ required: true, message: 'Please select Dial Mode' }]}
                                labelCol={{ span: 4 }}
                                wrapperCol={{ span: 18 }}
                            >
                                <Radio.Group
                                    value={formData.dialmode}
                                    onChange={(e) =>
                                        setFormData({ ...formData, dialmode: e.target.value })
                                    }
                                >
                                    <Radio value="manual">Manual</Radio>
                                    <Radio value="progressive">Progressive</Radio>
                                </Radio.Group>
                            </Form.Item>

                            {formData.dialmode === "progressive" && (
                                <Form.Item label="Lead" name="LeadEnabled"
                                    labelCol={{ span: 4 }}
                                    wrapperCol={{ span: 18 }}>
                                    <Switch
                                        checked={formData.leadEnabled}
                                        onChange={(checked) =>
                                            setFormData({ ...formData, leadEnabled: checked })
                                        }
                                    />
                                </Form.Item>
                            )}


                            <Form.Item label="Dashboard" name="dashboardEnabled" labelCol={{ span: 4 }}
                                wrapperCol={{ span: 18 }}>
                                <Switch
                                    checked={formData.dashboardEnabled}
                                    onChange={(checked) =>
                                        setFormData({ ...formData, dashboardEnabled: checked })
                                    }
                                />
                            </Form.Item>

                            <Form.Item label="Users" name="usersEnabled" labelCol={{ span: 4 }}
                                wrapperCol={{ span: 18 }}>
                                <Switch onChange={(checked) => handleSwitchChange('users', checked)} />
                            </Form.Item>

                            {usersEnabled && (
                                <div className="Onboard_menu_details_container_form_spliter">
                                    {usersFields.map(({ name, key }) => (
                                        <Form.Item label={name} key={key} name={key}>
                                            <InputNumber
                                                min={1}
                                                max={10}
                                                style={{ width: 200 }}
                                                value={formData[key]}
                                                onChange={(value) => setFormData({ ...formData, [key]: value })}
                                            />
                                        </Form.Item>
                                    ))}
                                </div>
                            )}

                            <Form.Item label="Queue" name="QueueEnabled" labelCol={{ span: 4 }}
                                wrapperCol={{ span: 18 }}>
                                <Switch onChange={(checked) => handleSwitchChange('queue', checked)} />
                            </Form.Item>

                            {queueEnabled && (
                                <div className="Onboard_menu_details_container_form_spliter">
                                    <Form.Item label="Queue Count" name="queueCount">
                                        <InputNumber min={1} max={10} style={{ width: 200 }} value={formData.queueCount} onChange={(value) => setFormData({ ...formData, queueCount: value })} />
                                    </Form.Item>
                                </div>
                            )}

                            <Form.Item label="Report" name="ReportEnabled" labelCol={{ span: 4 }}
                                wrapperCol={{ span: 18 }}>
                                <Switch onChange={(checked) => handleSwitchChange('report', checked)} />
                            </Form.Item>

                            {reportEnabled && (
                                <div className="Onboard_menu_details_container_form_spliter">
                                    <Form.Item label="Choose Reports" name="reports">
                                        <Select
                                            mode="multiple"
                                            allowClear
                                            style={{ width: 200 }}
                                            placeholder="Please select"
                                            options={[
                                                { label: "CDR Report", value: "cdrreport" },
                                                { label: "Full Process Report", value: "fullprocessreport" },
                                                { label: "Production Report", value: "productionreport" },
                                                { label: "Missed Calls Report", value: "missedcallsreport" },
                                                { label: "Hour Wise Report", value: "hourwisesreport" },
                                            ]}
                                        />
                                    </Form.Item>
                                </div>
                            )}

                            <Form.Item label="Settings" name="SettingsEnabled" labelCol={{ span: 4 }}
                                wrapperCol={{ span: 18 }}>
                                <Switch onChange={(checked) => handleSwitchChange('settings', checked)} />
                            </Form.Item>

                            {settingsEnabled && (
                                <div className="Onboard_menu_details_container_form_spliter">
                                    {['SkillList Count', 'BlockList Count', 'Carrier Count', 'Disposition Count', 'Callflow Count', 'BusinessHoliday Count'].map((field) => (
                                        <Form.Item label={field} key={field} name={field}>
                                            <InputNumber min={1} max={10} style={{ width: 200 }} value={formData[field]} onChange={(value) => setFormData({ ...formData, [field]: value })} />
                                        </Form.Item>
                                    ))}
                                </div>
                            )}

                            <Form.Item label="Ivr Blast" name="IvrblastEnabled" labelCol={{ span: 4 }}
                                wrapperCol={{ span: 18 }}>
                                <Switch onChange={(checked) => handleSwitchChange('ivrblast', checked)} />
                            </Form.Item>

                            {ivrblastEnabled && (
                                <div className="Onboard_menu_details_container_form_spliter">

                                    <Form.Item label="Campaign Count" name="IvrblastCampaignCount">
                                        <InputNumber min={1} max={10} style={{ width: 200 }} value={formData.IvrblastCampaignCount} onChange={(value) => setFormData({ ...formData, IvrblastCampaignCount: value })} />
                                    </Form.Item>
                                    <Form.Item label="Carrier Count" name="IvrblastCarrierCount">
                                        <InputNumber min={1} max={10} style={{ width: 200 }} value={formData.IvrblastCarrierCount} onChange={(value) => setFormData({ ...formData, IvrblastCarrierCount: value })} />
                                    </Form.Item>
                                    <Form.Item label="Ivrflow Count" name="IvrblastIvrflowCount">
                                        <InputNumber min={1} max={10} style={{ width: 200 }} value={formData.IvrblastIvrflowCount} onChange={(value) => setFormData({ ...formData, IvrblastIvrflowCount: value })} />
                                    </Form.Item>
                                    <Form.Item label="Ivrcreation Count" name="IvrblastCreationCount">
                                        <InputNumber min={1} max={10} style={{ width: 200 }} value={formData.IvrblastCreationCount} onChange={(value) => setFormData({ ...formData, IvrblastCreationCount: value })} />
                                    </Form.Item>
                                    <Form.Item label="Ivrblast Report" name="IvrblastReportEnabled">
                                        <Switch
                                            checked={formData.IvrblastdashboardEnabled}
                                            onChange={(checked) =>
                                                setFormData({ ...formData, IvrblastdashboardEnabled: checked })
                                            }
                                        />
                                    </Form.Item>

                                </div>
                            )}

                            <Form.Item label="Api integration" name="ApiIntegrationEnabled" labelCol={{ span: 4 }}
                                wrapperCol={{ span: 18 }}>
                                <Switch onChange={(checked) => handleSwitchChange('ApiIntegrationEnabled', checked)} />
                            </Form.Item>

                            {ApiIntegrationEnabled && (
                                <div className="Onboard_menu_details_container_form_spliter">
                                    <Form.Item label="User Count" name="ApiIntegrationUserCount">
                                        <InputNumber min={1} max={10} style={{ width: 200 }} />
                                    </Form.Item>
                                    <Form.Item label="Queue Count" name="ApiIntegrationQueueCount">
                                        <InputNumber min={1} max={10} style={{ width: 200 }} />
                                    </Form.Item>
                                    <Form.Item label="Carrier Count" name="ApiIntegrationCarrierCount">
                                        <InputNumber min={1} max={10} style={{ width: 200 }} />
                                    </Form.Item>
                                    <Form.Item label="Blocklist Count" name="ApiIntegrationBlocklistCount">
                                        <InputNumber min={1} max={10} style={{ width: 200 }} />
                                    </Form.Item>
                                    <Form.Item label="Callflow Count" name="ApiIntegrationCallflowCount">
                                        <InputNumber min={1} max={10} style={{ width: 200 }} />
                                    </Form.Item>
                                    <Form.Item label="BussinessHoliday Count" name="ApiIntegrationCallflowCount">
                                        <InputNumber min={1} max={10} style={{ width: 200 }} />
                                    </Form.Item>
                                    <Form.Item label="Dashboard" name="ApiIntegrationDashboardEnabled">
                                        <Switch />
                                    </Form.Item>
                                    <Form.Item label="Api Doc" name="ApiIntegrationApiDocEnabled">
                                        <Switch />
                                    </Form.Item>
                                    <Form.Item label="Control Panel" name="ApiIntegrationControlPanelEnabled">
                                        <Switch />
                                    </Form.Item>
                                    <Form.Item label="Choose Reports" name="reports">
                                        <Select
                                            mode="multiple"
                                            allowClear
                                            style={{ width: 200 }}
                                            placeholder="Please select"
                                            options={[
                                                { label: "CDR Report", value: "cdrreport" },
                                                { label: "Full Process Report", value: "fullprocessreport" },
                                                { label: "Production Report", value: "productionreport" },
                                                { label: "Missed Calls Report", value: "missedcallsreport" },
                                                { label: "Hour Wise Report", value: "hourwisesreport" },
                                            ]}
                                        />
                                    </Form.Item>

                                </div>
                            )}


                            <Form.Item label="Crm Integration" name="CrmIntegrationEnabled" labelCol={{ span: 4 }}
                                wrapperCol={{ span: 18 }}>
                                <Switch onChange={(checked) => handleSwitchChange('CrmIntegrationEnabled', checked)} />
                            </Form.Item>

                            {CrmIntegrationEnabled && (
                                <div className="Onboard_menu_details_container_form_spliter">
                                    <Form.Item label="ZOHO" name="CrmIntegrationZOHOEnabled">
                                        <Switch />
                                    </Form.Item>
                                    <Form.Item label="Custom" name="CrmIntegrationCustomEnabled">
                                        <Switch />
                                    </Form.Item>
                                </div>
                            )}

                            <Form.Item label="Whatsapp Integration" name="WhatsappIntegrationEnabled" labelCol={{ span: 4 }}
                                wrapperCol={{ span: 18 }}>
                                <Switch onChange={(checked) => handleSwitchChange('WhatsappIntegrationEnabled', checked)} />
                            </Form.Item>

                            {WhatsappIntegrationEnabled && (
                                <div className="Onboard_menu_details_container_form_spliter">
                                    <Form.Item label="Template Count" name="WhatsappIntegrationTemplateCount">
                                        <InputNumber min={1} max={10} style={{ width: 200 }} />
                                    </Form.Item>
                                    <Form.Item label="Campaign Count" name="WhatsappIntegrationCampaignCount">
                                        <InputNumber min={1} max={10} style={{ width: 200 }} />
                                    </Form.Item>
                                    <Form.Item label="Group Count" name="WhatsappIntegrationGroup">
                                        <InputNumber min={1} max={10} style={{ width: 200 }} />
                                    </Form.Item>
                                    <Form.Item label="Dashboard" name="WhatsappIntegrationDashboard">
                                        <Switch />
                                    </Form.Item>
                                    <Form.Item label="Messenger" name="WhatsappIntegrationMessenger">
                                        <Switch />
                                    </Form.Item>
                                    <Form.Item label="Report" name="WhatsappIntegrationReport">
                                        <Switch />
                                    </Form.Item>
                                </div>
                            )}

                            <Form.Item label="Agent panel" name="Agentpanel" labelCol={{ span: 4 }}
                                wrapperCol={{ span: 18 }}>
                                <Switch onChange={(checked) => handleSwitchChange('AgentPanelEnabled', checked)} />
                            </Form.Item>

                            {AgentPanelEnabled && (
                                <div className="Onboard_menu_details_container_form_spliter">
                                    <Form.Item label="Hold" name="AgentpanelHold">
                                        <Switch />
                                    </Form.Item>
                                    <Form.Item label="Conference" name="AgentpanelConference">
                                        <Switch />
                                    </Form.Item>
                                    <Form.Item label="Blind Transfer" name="AgentpanelBlindtransfer">
                                        <Switch />
                                    </Form.Item>
                                    <Form.Item label="Warm Transfer" name="AgentpanelWarmtransfer">
                                        <Switch />
                                    </Form.Item>
                                </div>
                            )}
                        </Form>
                    </div>
                )}

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: 24,
                    }}
                >
                    {current > 0 && (
                        <Button
                            style={{
                                margin: '0 8px',
                            }}
                            onClick={prev}
                        >
                            Previous
                        </Button>
                    )}
                    {current < steps.length - 1 && (
                        <Button type="primary" onClick={next}>
                            Next
                        </Button>
                    )}
                    {current === steps.length - 1 && (
                        <Button
                            type="primary"
                            onClick={apicall}
                        >
                            Done
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Onboard;
