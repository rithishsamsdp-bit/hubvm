import { useState, useEffect } from "react";
import Icon from "../../constants/Icon.jsx";
import { Input, Select, Loader, Button } from "../../components/Index.jsx";
import "./styles/RingToPanel.css";
import { usePhoneNumberStore } from "../../store/admin/usePhoneNumberStore.js";

export default function ApiPanel({ rule, onRuleChange }) {
    const [showCallInitSettings, setShowCallInitSettings] = useState(true);
    const [showPostCallSettings, setShowPostCallSettings] = useState(true);

    const { getAgents, agentsData, agentsLoading, getQueue, queueLoading, queueData } =
        usePhoneNumberStore();

    const updateRule = (updates) => onRuleChange({ ...rule, ...updates });

    useEffect(() => {
        getAgents();
        getQueue();
    }, []);

    if (agentsLoading && queueLoading) return <Loader />;

    /* Reusable URL builder */
    const buildGetUrl = (base, params) => {
        if (!base) return "";

        const queryString = (params || [])
            .filter((p) => p.key && p.value)
            .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
            .join("&");

        return queryString ? `${base}?${queryString}` : base;
    };

    return (
        <div className="ringto-sidebar">

            {/* ---------------- CALL INITIATION API SECTION ---------------- */}
            <div className="keypad-panel-message-settings">

                <div
                    className="keypad-sidepanel-section-header"
                    onClick={() => setShowCallInitSettings(!showCallInitSettings)}
                >
                    <p>Call Initiation API</p>
                    <Icon
                        name={showCallInitSettings ? "uparrow" : "downarrow"}
                        size={12}
                        color="#0F172A"
                    />
                </div>

                {showCallInitSettings && (
                    <div className="api-section">

                        {/* BASE URL */}
                        <p className="ringto-sidepanel-input-label">API URL</p>
                        <Input
                            type="text"
                            placeholder="Enter API endpoint"
                            value={rule.callApiBaseUrl || ""}
                            onChange={(e) => {
                                const base = e.target.value;
                                updateRule({ callApiBaseUrl: base });

                                const finalUrl = buildGetUrl(base, rule.callApiParams || []);
                                updateRule({ callApiUrl: finalUrl });
                            }}
                        />

                        {/* METHOD */}
                        <p className="ringto-sidepanel-input-label">Method</p>
                        <Select
                            mode="single"
                            placeholder="Select"
                            showSearch={false}
                            value={rule.callApiMethod}
                            onChange={(value) => updateRule({ callApiMethod: value })}
                            options={[{ label: "POST", value: "POST" }]}
                        />

                        {/* POST BODY */}
                        {rule.callApiMethod === "POST" && (
                            <div className="post-body-section">
                                <p className="ringto-sidepanel-input-label">JSON Body</p>
                                <textarea
                                    className="ringto-json-textarea"
                                    placeholder='{"key": "value"}'
                                    value={rule.callApiJson || ""}
                                    onChange={(e) =>
                                        updateRule({ callApiJson: e.target.value })
                                    }
                                    rows={6}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ---------------- POST CALL API SECTION ---------------- */}
            <div className="keypad-panel-message-settings">

                <div
                    className="keypad-sidepanel-section-header"
                    onClick={() => setShowPostCallSettings(!showPostCallSettings)}
                >
                    <p>Post Call API</p>
                    <Icon
                        name={showPostCallSettings ? "uparrow" : "downarrow"}
                        size={12}
                        color="#0F172A"
                    />
                </div>

                {showPostCallSettings && (
                    <div className="api-section">

                        {/* BASE URL */}
                        <p className="ringto-sidepanel-input-label">API URL</p>
                        <Input
                            type="text"
                            placeholder="Enter API endpoint"
                            value={rule.postCallApiBaseUrl || ""}
                            onChange={(e) => {
                                const base = e.target.value;
                                updateRule({ postCallApiBaseUrl: base });

                                const finalUrl = buildGetUrl(base, rule.postCallApiParams || []);
                                updateRule({ postCallApiUrl: finalUrl });
                            }}
                        />

                        {/* METHOD */}
                        <p className="ringto-sidepanel-input-label">Method</p>
                        <Select
                            mode="single"
                            placeholder="Select"
                            showSearch={false}
                            value={rule.postCallApiMethod}
                            onChange={(value) => updateRule({ postCallApiMethod: value })}
                            options={[{ label: "POST", value: "POST" }]}
                        />

                        {/* POST BODY */}
                        {rule.postCallApiMethod === "POST" && (
                            <div className="post-body-section">
                                <p className="ringto-sidepanel-input-label">JSON Body</p>
                                <textarea
                                    className="ringto-json-textarea"
                                    placeholder='{"key": "value"}'
                                    value={rule.postCallApiJson || ""}
                                    onChange={(e) =>
                                        updateRule({ postCallApiJson: e.target.value })
                                    }
                                    rows={6}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
