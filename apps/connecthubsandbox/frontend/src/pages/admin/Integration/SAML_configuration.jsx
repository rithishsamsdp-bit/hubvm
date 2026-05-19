import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import Icon from '../../../constants/Icon.jsx';
import { useAuthStore } from '../../../store/useAuthStore.js';
import { useSSOIntegrationStore } from '../../../store/admin/Integration/useSSOIntegrationStore.js';
import './styles/SAML_configuration.css';

const tabs = ["Configuration", "Synchronize Details"];

const SAML_configuration = () => {
    const navigate = useNavigate();
    const { authRole } = useAuthStore();
    const { createSAMLConfig, createLoading, updateSyncConfig } = useSSOIntegrationStore();
    const [activeTab, setActiveTab] = useState("Configuration");

    // Configuration Form State
    const [formData, setFormData] = useState({
        domain: '',
        azureEntityId: '',
        ssoLoginUrl: '',
        certificate: null
    });

    // Synchronization Form State
    const [syncData, setSyncData] = useState({
        tenantId: '',
        clientId: '',
        clientSecret: '',
        scope: 'https://graph.microsoft.com/.default',
        grantType: 'client_credentials',
        appObjectId: ''
    });

    const { ssoConfigData, getSAMLConfig } = useSSOIntegrationStore();

    useEffect(() => {
        getSAMLConfig();
    }, [getSAMLConfig]);

    useEffect(() => {
        if (ssoConfigData) {
            // Populate Configuration Tab
            setFormData({
                domain: ssoConfigData.domain || '',
                azureEntityId: ssoConfigData.entity_id || '',
                ssoLoginUrl: ssoConfigData.login_url || '',
                certificate: null // File input cannot be pre-filled securely
            });

            // Populate Synchronization Details Tab
            if (ssoConfigData.synchronize_apis && Array.isArray(ssoConfigData.synchronize_apis)) {
                const tokenApi = ssoConfigData.synchronize_apis.find(api => api.API_name === "Token API");
                const auditApi = ssoConfigData.synchronize_apis.find(api => api.API_name === "Audit Logs API");

                let newSyncData = { ...syncData };

                if (tokenApi && tokenApi.body) {
                    newSyncData.clientId = tokenApi.body.client_id || '';
                    newSyncData.clientSecret = tokenApi.body.client_secret || '';
                    newSyncData.scope = tokenApi.body.scope || 'https://graph.microsoft.com/.default';
                    newSyncData.grantType = tokenApi.body.grant_type || 'client_credentials';

                    // Extract Tenant ID from URL
                    // URL format: https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
                    const tenantMatch = tokenApi.API_URl?.match(/microsoftonline\.com\/([^\/]+)\/oauth2/);
                    if (tenantMatch && tenantMatch[1]) {
                        newSyncData.tenantId = tenantMatch[1];
                    }
                }

                if (auditApi) {
                    // Extract App Object ID from URL
                    // URL format: https://graph.microsoft.com/v1.0/servicePrincipals/{appObjectId}/appRoleAssignedTo
                    const appObjectMatch = auditApi.API_URl?.match(/servicePrincipals\/([^\/]+)\/appRoleAssignedTo/);
                    if (appObjectMatch && appObjectMatch[1]) {
                        newSyncData.appObjectId = appObjectMatch[1];
                    }
                }

                setSyncData(newSyncData);
            }
        }
    }, [ssoConfigData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSyncInputChange = (e) => {
        const { name, value } = e.target;
        setSyncData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.name.endsWith('.cer')) {
            setFormData(prev => ({
                ...prev,
                certificate: file
            }));
        } else {
            alert('Please upload a valid .cer file');
            e.target.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        console.log('Form submitted with data:', formData);

        if (!formData.certificate) {
            alert('Please upload a certificate file');
            return;
        }

        console.log('Starting SAML configuration submission...');

        try {
            const result = await createSAMLConfig(formData);
            console.log('SAML configuration created successfully:', result);
            // Switch to Synchronize Details tab (required step)
            setActiveTab("Synchronize Details");
        } catch (error) {
            // Error is already handled in the store with toast
            console.error('Failed to create SAML configuration:', error);
            console.error('Error details:', {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message
            });
        }
    };

    const handleSyncSubmit = async (e) => {
        e.preventDefault();

        if (!syncData.tenantId) {
            alert("Tenant ID is required.");
            return;
        }
        if (!syncData.appObjectId) {
            alert("App Object ID is required.");
            return;
        }

        const payload = [
            {
                "API_name": "Token API",
                "API_URl": `https://login.microsoftonline.com/${syncData.tenantId}/oauth2/v2.0/token`,
                "body": {
                    "client_id": syncData.clientId,
                    "client_secret": syncData.clientSecret,
                    "scope": syncData.scope,
                    "grant_type": syncData.grantType
                },
                "bodyType": "x-www-form-urlencoded",
                "method": "POST"
            },
            {
                "API_name": "Audit Logs API",
                "API_URl": `https://graph.microsoft.com/v1.0/servicePrincipals/${syncData.appObjectId}/appRoleAssignedTo`,
                "method": "GET"
            }
        ];

        console.log("Synchronize Payload:", JSON.stringify(payload, null, 2));

        try {
            await updateSyncConfig(payload);
            // Navigate back to SSO integration page after completing both steps
            navigate('/admin/integration/sso');
        } catch (error) {
            console.error("Failed to submit sync config:", error);
        }
    };

    return (
        <div className="sso_page">
            <div className="navbar_2">
                <div>
                    <p className="navbar_2_heading">SSO Integration</p>
                    <span className="navbar_2_breadcrumb">
                        <span
                            className="navbar_2_breadcrumb_item"
                            onClick={() => {
                                if (authRole === "TL") {
                                    navigate("/tl-dashboard");
                                } else if (authRole === "ADMIN") {
                                    navigate("/admin-dashboard");
                                }
                            }}
                        >
                            Dashboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span
                            className="navbar_2_breadcrumb_item"
                            onClick={() => navigate("/admin/integration")}
                        >
                            Integration
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span
                            className="navbar_2_breadcrumb_item"
                            onClick={() => navigate("/admin/integration/sso")}
                        >
                            SSO integration
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_2_breadcrumb_item active">
                            SAML Configuration
                        </span>
                    </span>

                    <div className="navbar_2_tabs">
                        {tabs.map((tab) => (
                            <div
                                key={tab}
                                className={`navbar_2_tab_item ${activeTab === tab ? "active" : ""}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="sso-integration-container" style={{ marginTop: '24px' }}>
                {activeTab === "Configuration" && (
                    <form className="sso-form" onSubmit={handleSubmit}>
                        <div className="sso-header">
                            <p>Configure your Single Sign-On settings using SAML protocol</p>
                        </div>
                        <div className="form-group">
                            <label htmlFor="domain">Domain:</label>
                            <Input
                                id="domain"
                                name="domain"
                                type="text"
                                value={formData.domain}
                                onChange={handleInputChange}
                                placeholder="example.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="azureEntityId">Azure Entity ID:</label>
                            <Input
                                id="azureEntityId"
                                name="azureEntityId"
                                type="text"
                                value={formData.azureEntityId}
                                onChange={handleInputChange}
                                placeholder="https://sts.windows.net/..."
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="ssoLoginUrl">SSO Login URL:</label>
                            <Input
                                id="ssoLoginUrl"
                                name="ssoLoginUrl"
                                type="url"
                                value={formData.ssoLoginUrl}
                                onChange={handleInputChange}
                                placeholder="https://login.microsoftonline.com/..."
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="certificate">Certificate (Base64) (.cer file):</label>
                            <div className="sso_file_upload_area">
                                <div className="upload_icon_wrapper">
                                    <Icon name="upload" />
                                </div>
                                <p>
                                    <span className="upload_click_text">Click to upload</span> or drag
                                    and drop here
                                </p>
                                <input
                                    type="file"
                                    id="certificate"
                                    name="certificate"
                                    accept=".cer"
                                    onChange={handleFileChange}
                                    required
                                />
                            </div>
                            {formData.certificate && (
                                <span className="file-name">{formData.certificate.name}</span>
                            )}
                        </div>

                        <div className="form-actions">
                            <Button type="submit" variant="primary" disabled={createLoading}>
                                {createLoading ? 'Saving...' : 'Save Configuration'}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => navigate('/admin/integration/sso')}
                                disabled={createLoading}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                )}

                {activeTab === "Synchronize Details" && (
                    <form className="sso-form" onSubmit={handleSyncSubmit}>
                        <div className="sso-header">
                            <p>Synchronize details with Microsoft Graph API</p>
                        </div>

                        {/* URL Previews */}
                        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>Token API URL:</p>
                                <code style={{ fontSize: '12px', color: '#0f172a', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                    https://login.microsoftonline.com/<span style={{ color: '#2563EB', fontWeight: 'bold' }}>{syncData.tenantId || '{tenantId}'}</span>/oauth2/v2.0/token
                                </code>
                            </div>
                            <div style={{ borderTop: '1px dashed #cbd5e1' }}></div>
                            <div>
                                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>Audit Logs API URL:</p>
                                <code style={{ fontSize: '12px', color: '#0f172a', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                    https://graph.microsoft.com/v1.0/servicePrincipals/<span style={{ color: '#2563EB', fontWeight: 'bold' }}>{syncData.appObjectId || '{appObjectId}'}</span>/appRoleAssignedTo
                                </code>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="tenantId">Tenant ID:</label>
                            <Input
                                id="tenantId"
                                name="tenantId"
                                type="text"
                                value={syncData.tenantId}
                                onChange={handleSyncInputChange}
                                placeholder="Enter Tenant ID (e.g. f22c18cf...)"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="appObjectId">App Object ID:</label>
                            <Input
                                id="appObjectId"
                                name="appObjectId"
                                type="text"
                                value={syncData.appObjectId}
                                onChange={handleSyncInputChange}
                                placeholder="Enter App Object ID"
                                required
                            />
                        </div>

                        <div style={{ margin: '10px 0', borderTop: '1px solid #f1f5f9' }}></div>

                        <div className="form-group">
                            <label htmlFor="clientId">Client ID:</label>
                            <Input
                                id="clientId"
                                name="clientId"
                                type="text"
                                value={syncData.clientId}
                                onChange={handleSyncInputChange}
                                placeholder="Enter Client ID"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="clientSecret">Client Secret:</label>
                            <Input
                                id="clientSecret"
                                name="clientSecret"
                                type="password"
                                value={syncData.clientSecret}
                                onChange={handleSyncInputChange}
                                placeholder="Enter Client Secret"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="scope">Scope:</label>
                            <Input
                                id="scope"
                                name="scope"
                                type="text"
                                value={syncData.scope}
                                onChange={handleSyncInputChange}
                                placeholder="https://graph.microsoft.com/.default"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="grantType">Grant Type:</label>
                            <Input
                                id="grantType"
                                name="grantType"
                                type="text"
                                value={syncData.grantType}
                                onChange={handleSyncInputChange}
                                placeholder="client_credentials"
                                required
                            />
                        </div>

                        <div className="form-actions">
                            <Button type="submit" variant="primary">
                                Submit
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default SAML_configuration;
