import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import Icon from '../../../constants/Icon.jsx';
import { useAuthStore } from '../../../store/useAuthStore.js';
import { useSSOIntegrationStore } from '../../../store/admin/Integration/useSSOIntegrationStore.js';
import './styles/SAML_configuration.css';

const GoogleSAMLConfiguration = () => {
    const navigate = useNavigate();
    const { authRole } = useAuthStore();
    const { createSAMLConfig, createLoading, googleConfigData, getSAMLConfig } = useSSOIntegrationStore();

    // Configuration Form State
    const [formData, setFormData] = useState({
        domain: '',
        entityId: '',
        loginUrl: '',
        certificate: null
    });

    useEffect(() => {
        getSAMLConfig('google');
    }, [getSAMLConfig]);

    useEffect(() => {
        if (googleConfigData) {
            setFormData({
                domain: googleConfigData.domain || '',
                entityId: googleConfigData.entity_id || '',
                loginUrl: googleConfigData.login_url || '',
                certificate: null
            });
        }
    }, [googleConfigData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
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

        if (!formData.certificate && !googleConfigData?.certificate) {
            alert('Please upload a certificate file');
            return;
        }

        try {
            await createSAMLConfig(formData, 'google');
            navigate('/admin/integration/sso');
        } catch (error) {
            console.error('Failed to create Google SAML configuration:', error);
        }
    };

    return (
        <div className="sso_page">
            <div className="navbar_2">
                <div>
                    <p className="navbar_2_heading">Google SSO Integration</p>
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
                            Google SAML Configuration
                        </span>
                    </span>
                </div>
            </div>

            <div className="sso-integration-container" style={{ marginTop: '24px' }}>
                <form className="sso-form" onSubmit={handleSubmit}>
                    <div className="sso-header">
                        <p>Configure your Google Workspace Single Sign-On settings using SAML protocol</p>
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
                        <label htmlFor="entityId">Google Entity ID:</label>
                        <Input
                            id="entityId"
                            name="entityId"
                            type="text"
                            value={formData.entityId}
                            onChange={handleInputChange}
                            placeholder="https://accounts.google.com/o/saml2?idpid=..."
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="loginUrl">SSO Login URL:</label>
                        <Input
                            id="loginUrl"
                            name="loginUrl"
                            type="url"
                            value={formData.loginUrl}
                            onChange={handleInputChange}
                            placeholder="https://accounts.google.com/o/saml2/idp?idpid=..."
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="certificate">Certificate (.cer file):</label>
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
                                required={!googleConfigData?.certificate}
                            />
                        </div>
                        {formData.certificate && (
                            <span className="file-name-selected" style={{ marginTop: '8px', display: 'inline-block' }}>
                                {formData.certificate.name}
                            </span>
                        )}
                        {!formData.certificate && googleConfigData?.certificate && (
                            <span className="file-name-selected" style={{ marginTop: '8px', display: 'inline-block', color: '#64748b', background: '#f1f5f9' }}>
                                Existing certificate loaded
                            </span>
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
            </div>
        </div>
    );
};

export default GoogleSAMLConfiguration;
