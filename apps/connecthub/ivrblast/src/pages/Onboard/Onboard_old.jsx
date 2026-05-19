import React, { useState } from 'react';
import './style/Onboard.css';
import { Button, message, Steps, Input, Form, InputNumber, Radio, Switch, Select } from 'antd';

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
    const [ivrblastCampaignEnabled, setIvrblastCampaignEnabled] = useState(false);
    const [ivrblastCarrierEnabled, setIvrblastCarrierEnabled] = useState(false);

    // Single state to handle all form fields
    const [formData, setFormData] = useState({
        companyName: '',
        companyStrength: '',
        mobile: '',
        email: '',
        description: '',
        dialmode: '',
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
        IvrblastCarrierCount:1,
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
                    // Reset user-related fields if users are disabled
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
                    // Reset queue-related fields if queue is disabled
                    setFormData((prevData) => ({
                        ...prevData,
                        queueCount: 1,
                    }));
                }
                break;
            case 'report':
                setReportEnabled(checked);
                if (!checked) {
                    // Reset report-related fields if report is disabled
                    setFormData((prevData) => ({
                        ...prevData,
                        reports: [],
                    }));
                }
                break;
            case 'settings':
                setSettingsEnabled(checked);
                if (!checked) {
                    // Reset settings-related fields if settings are disabled
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
                    // Reset IVR blast-related fields if IVR Blast is disabled
                    setFormData((prevData) => ({
                        ...prevData,
                        IvrblastCampaignCount: 1
                    }));
                    setIvrblastCampaignEnabled(false);
                }
                break;
            case 'ivrblastCampaign':
                setIvrblastCampaignEnabled(checked);
                if (!checked) {
                    setFormData((prevData) => ({
                        ...prevData,
                        IvrblastCampaignCount: 1,
                    }));


                }
                break;
            case 'ivrblastCarrier':
                setIvrblastCarrierEnabled(checked);
                if (!checked) {
                    setFormData((prevData) => ({
                        ...prevData,
                        IvrblastCarrierCount: 1,
                    }));


                }
                break;
            default:
                break;
        }
    };

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
                        <Form>
                            <Form.Item label="Dial Mode" name="dialmode" rules={[{ required: true, message: 'Please select Dial Mode' }]}>
                                <Radio.Group
                                    value={formData.dialmode}
                                    onChange={(e) => setFormData({ ...formData, dialmode: e.target.value })}
                                >
                                    <Radio value="manual">Manual</Radio>
                                    <Radio value="progressive">Progressive</Radio>
                                </Radio.Group>
                            </Form.Item>

                            <Form.Item label="Dashboard" name="dashboardEnabled">
                                <Switch />
                            </Form.Item>

                            <Form.Item label="Users" name="usersEnabled">
                                <Switch onChange={(checked) => handleSwitchChange('users', checked)} />
                            </Form.Item>

                            {usersEnabled && (
                                <div className="Onboard_menu_details_container_form_spliter">
                                    {['agentCount', 'adminCount', 'tlCount', 'superAdminCount'].map((field) => (
                                        <Form.Item label={field} key={field} name={field}>
                                            <InputNumber min={1} max={10} style={{ width: 200 }} value={formData[field]} onChange={(value) => setFormData({ ...formData, [field]: value })} />
                                        </Form.Item>
                                    ))}
                                </div>
                            )}

                            <Form.Item label="Queue" name="QueueEnabled">
                                <Switch onChange={(checked) => handleSwitchChange('queue', checked)} />
                            </Form.Item>

                            {queueEnabled && (
                                <div className="Onboard_menu_details_container_form_spliter">
                                    <Form.Item label="Queue Count" name="queueCount">
                                        <InputNumber min={1} max={10} style={{ width: 200 }} value={formData.queueCount} onChange={(value) => setFormData({ ...formData, queueCount: value })} />
                                    </Form.Item>
                                </div>
                            )}

                            <Form.Item label="Report" name="ReportEnabled">
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

                            <Form.Item label="Settings" name="SettingsEnabled">
                                <Switch onChange={(checked) => handleSwitchChange('settings', checked)} />
                            </Form.Item>

                            {settingsEnabled && (
                                <div className="Onboard_menu_details_container_form_spliter">
                                    {['SkillListCount', 'BlockListCount', 'CarrierCount', 'DispositionCount', 'CallflowCount', 'BusinessHolidayCount'].map((field) => (
                                        <Form.Item label={field} key={field} name={field}>
                                            <InputNumber min={1} max={10} style={{ width: 200 }} value={formData[field]} onChange={(value) => setFormData({ ...formData, [field]: value })} />
                                        </Form.Item>
                                    ))}
                                </div>
                            )}

                            <Form.Item label="Ivr Blast" name="IvrblastEnabled">
                                <Switch onChange={(checked) => handleSwitchChange('ivrblast', checked)} />
                            </Form.Item>

                            {ivrblastEnabled && (
                                <div className="Onboard_menu_details_container_form_spliter">
                                    <Form.Item label="Campaign" name="IvrblastCampaignEnabled">
                                        <Switch onChange={(checked) => handleSwitchChange('ivrblastCampaign', checked)} />
                                    </Form.Item>
                                    {ivrblastEnabled && ivrblastCampaignEnabled && (
                                        <Form.Item label="Campaign Count" name="IvrblastCampaignCount">
                                            <InputNumber min={1} max={10} style={{ width: 200 }} value={formData.IvrblastCampaignCount} onChange={(value) => setFormData({ ...formData, IvrblastCampaignCount: value })} />
                                        </Form.Item>
                                    )}
                                    <Form.Item label="Carrier" name="IvrblastCarrierEnabled">
                                        <Switch onChange={(checked) => handleSwitchChange('ivrblastCarrier', checked)} />
                                    </Form.Item>
                                    {ivrblastEnabled && ivrblastCarrierEnabled && (
                                        <Form.Item label="Carrier Count" name="IvrblastCarrierCount">
                                            <InputNumber min={1} max={10} style={{ width: 200 }} value={formData.IvrblastCarrierCount} onChange={(value) => setFormData({ ...formData, IvrblastCarrierCount: value })} />
                                        </Form.Item>
                                    )}

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
                            onClick={() => message.success('Processing complete!')}
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
