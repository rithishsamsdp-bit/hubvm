import { useState } from "react";
import Icon from "../../constants/Icon.jsx";
import "./styles/WaitingExperiencePanel.css";
import { Input, Select } from "../../components/Index.jsx";

export default function WaitingExperiencePanel({ rule, onRuleChange }) {
    const updateRule = updates => onRuleChange({ ...rule, ...updates });
    const [showSettings, setShowSettings] = useState(true);
    const [showMusicSettings, setShowMusicSettings] = useState(true);

    return (
        <div className="waitingExperience-sidebar" >
            <div className="waitingExperience-panel-settings">
                <div
                    className="waitingExperience-sidepanel-section-header"
                    onClick={() => setShowSettings((s) => !s)}
                >
                    <p>Settings</p>
                    <Icon name={showSettings ? "uparrow" : "downarrow"} size={12} color="#0F172A" />
                </div>
                {showSettings && (
                    <div>
                        <p className="waitingExperience-sidepanel-input-label">Waiting experience (optional)</p>
                        <Input
                            type="text"
                            placeholder="Enter waiting experience"
                            value={rule.title || ''}
                            onChange={e => updateRule({ title: e.target.value })}
                        />

                    </div>
                )}
            </div>

            <div className="waitingExperience-panel-music-settings">
                <div
                    className="waitingExperience-sidepanel-section-header"
                    onClick={() => setShowMusicSettings((s) => !s)}
                >
                    <p>Waiting Music</p>
                    <Icon name={showSettings ? "uparrow" : "downarrow"} size={12} color="#0F172A" />
                </div>

                {showMusicSettings && (
                    <div>
                        <p className="waitingExperience-sidepanel-input-label">Audio Source</p>
                        <Select
                            mode="single"
                            placeholder="select"
                            showSearch={false}
                            value={rule.instructionType}
                            onChange={(value) =>
                                onRuleChange({ ...rule, soundName: value })
                            }
                            options={[
                                { label: "Ding Ding", value: "Dingding" },
                                { label: "Ring Ring", value: "ringring" },
                                { label: "Girrr", value: "girrr" },
                            ]}
                        >
                        </Select>
                        <div className="waitingExperience-panel-music-settings-audio-bar">
                            <button className="waitingExperience-panel-music-settings-play-btn">▶</button>
                            <span className="waitingExperience-panel-music-settings-time-text">02:00/05:32</span>
                            <button className="waitingExperience-panel-music-settings-mute-btn">🔇</button>
                        </div>
                    </div>
                )}
            </div>



         
        </div>
    );
}
