import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/Button';
import Icon from '../../../constants/Icon.jsx';
import { useAuthStore } from '../../../store/useAuthStore.js';
import { useSSOIntegrationStore } from '../../../store/admin/Integration/useSSOIntegrationStore.js';
import './styles/SSO_integration.css';

const SSO_integration = () => {
    const navigate = useNavigate();
    const { authRole } = useAuthStore();
    const { getSAMLConfig, disconnectSAMLConfig, ssoConfigData, googleConfigData, createLoading } = useSSOIntegrationStore();

    useEffect(() => {
        getSAMLConfig('azure');
        getSAMLConfig('google');
    }, [getSAMLConfig]);

    const isAzureConnected = !!(ssoConfigData && ssoConfigData.domain);
    const isGoogleConnected = !!(googleConfigData && googleConfigData.domain);

    const ssoProviders = [
        { name: "Google", icon: "google", iconSize: 55, active: true, providerKey: 'google' },
        { name: "Microsoft/Azure AD", icon: "microsoft_azure", iconSize: 65, active: true, providerKey: 'azure' },
        { name: "Okta", icon: "okta", iconSize: 95, active: false },
        { name: "Auth0", icon: "auth0", iconSize: 95, active: false },
        { name: "AWS Cognito", icon: "cognito", iconSize: 65, active: false },
        { name: "Keycloak", icon: "keycloak", iconSize: 95, active: false },
    ];

    const handleConnect = (provider) => {
        if (provider.name === "Microsoft/Azure AD") {
            navigate('/admin/integration/sso/saml-config');
        } else if (provider.name === "Google") {
            navigate('/admin/integration/sso/google-saml-config');
        } else {
            console.log(`Connection for ${provider.name} is coming soon`);
        }
    };

    const handleDisconnect = async (provider) => {
        const providerName = provider.name === "Microsoft/Azure AD" ? "Azure" : "Google";
        const providerKey = provider.name === "Microsoft/Azure AD" ? "azure" : "google";

        if (window.confirm(`Are you sure you want to disconnect ${providerName} SAML integration?`)) {
            await disconnectSAMLConfig(providerKey);
        }
    };

    return (
        <div className="sso_page">
            <div className="navbar_1">
                <div>
                    <p className="navbar_1_heading">SSO Integration</p>
                    <span className="navbar_1_breadcrumb">
                        <span
                            className="navbar_1_breadcrumb_item"
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
                            className="navbar_1_breadcrumb_item"
                            onClick={() => navigate("/admin/integration")}
                        >
                            Integration
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item active">
                            SSO integration
                        </span>
                    </span>
                </div>
            </div>

            <div className="sso-integration-container">
                <div className="sso-header">
                    <p>Connect your Single Sign-On provider to streamline access</p>
                </div>

                <div className="sso_cards_grid">
                    {ssoProviders.map((provider, index) => {
                        let isConnected = false;
                        if (provider.name === "Microsoft/Azure AD") {
                            isConnected = isAzureConnected;
                        } else if (provider.name === "Google") {
                            isConnected = isGoogleConnected;
                        }

                        return (
                            <div
                                key={index}
                                className="sso_card"
                            >
                                <div className="sso-card-header">
                                    <Icon name={provider.icon} size={provider.iconSize} />
                                    <div className="sso-status-icon">
                                        {isConnected ? (
                                            <Icon name="verified" size={24} />
                                        ) : (
                                            <Icon name="not_verified" size={24} color="rgb(42, 42, 42)" />
                                        )}
                                    </div>
                                </div>
                                <p className="sso_card_name">{provider.name}</p>

                                {isConnected ? (
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleDisconnect(provider)}
                                        disabled={createLoading}
                                    >
                                        {createLoading ? 'Wait...' : 'Disconnect'}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleConnect(provider)}
                                        disabled={!provider.active}
                                    >
                                        Connect
                                    </Button>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export default SSO_integration;
