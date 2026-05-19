// sidepanels/TimeRulePanel.jsx
import React, { useState } from "react";
import "./styles/TimeRulePanel.css";
import Icon from "../../constants/Icon.jsx";
import { Input, Select, Button } from "../../components/Index.jsx";

/**
 * Props:
 * - rule: {
 *     title?: string,
 *     timeZone?: string,
 *     branches?: Array<{
 *       id: number,
 *       title: string,
 *       days: number[],           // 0..6 (Sun..Sat)
 *       timeSlots: Array<{ id:number, from:string, to:string }>,
 *       nodeId?: string           // canvas node id linked to this branch
 *     }>
 *   }
 * - onRuleChange(updatedRule)
 * - onImmediateAdd({ title }) => string | null   // returns created nodeId
 * - onSyncChildNode({ nodeId, label })
 * - onRemoveChildNode(nodeId)
 */
export default function TimeRulePanel({
    rule,
    onRuleChange,
    onImmediateAdd,
    onSyncChildNode,
    onRemoveChildNode,
}) {
    const [showSettings, setShowSettings] = useState(true);
    const [showBranches, setShowBranches] = useState(true);

    const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
    const branches = Array.isArray(rule?.branches) ? rule.branches : [];

    // ---- helpers that always push changes up to parent ----
    const updateRule = (updates) => onRuleChange({ ...rule, ...updates });

    const setBranches = (next) => updateRule({ branches: next });

    const updateBranch = (branchId, updates) => {
        const next = branches.map((b) => (b.id === branchId ? { ...b, ...updates } : b));
        setBranches(next);
    };

    const toggleDay = (branchId, dayIndex) => {
        const branch = branches.find((b) => b.id === branchId);
        if (!branch) return;
        const days = branch.days.includes(dayIndex)
            ? branch.days.filter((d) => d !== dayIndex)
            : [...branch.days, dayIndex];
        updateBranch(branchId, { days });
    };

    const updateTimeSlot = (branchId, slotId, field, value) => {
        const branch = branches.find((b) => b.id === branchId);
        if (!branch) return;
        const timeSlots = branch.timeSlots.map((s) => (s.id === slotId ? { ...s, [field]: value } : s));
        updateBranch(branchId, { timeSlots });
    };

    // --- CORE FEATURES ---

    // Single state update: create node first, then append branch with nodeId
    const addBranch = (initial = {}) => {
        const now = Date.now();

        // 1) create the node on the canvas to get its id
        const createdNodeId =
            onImmediateAdd?.({ title: initial.title || "New Branch" }) || null;

        // 2) build the branch object fully (including nodeId)
        const newBranch = {
            id: now,
            title: initial.title ?? "New Branch",
            days: initial.days ?? [],
            timeSlots: initial.timeSlots ?? [{ id: now + 1, from: "", to: "" }],
            nodeId: createdNodeId,
        };

        // 3) single update — avoids stale closures and ensures UI shows immediately
        const nextBranches = [...branches, newBranch];
        setBranches(nextBranches);
    };

    // Change branch title → sync only that node's label
    const handleBranchTitleChange = (branch, title) => {
        const next = branches.map((b) => (b.id === branch.id ? { ...b, title } : b));
        setBranches(next);

        if (branch.nodeId) {
            onSyncChildNode?.({ nodeId: branch.nodeId, label: title || "New Branch" });
        }
    };

    // Remove branch → delete specific node first, then remove branch entry
    const removeBranch = (branchId) => {
        const b = branches.find((x) => x.id === branchId);
        if (b?.nodeId) onRemoveChildNode?.(b.nodeId);

        const next = branches.filter((x) => x.id !== branchId);
        setBranches(next);
    };

    return (
        <div className="timerule-sidebar">
            {/* ===== Settings ===== */}
            <div className="timerule-panel-settings">
                <div
                    className="timerule-sidepanel-section-header"
                    onClick={() => setShowSettings((s) => !s)}
                >
                    <p>Settings</p>
                    <Icon name={showSettings ? "uparrow" : "downarrow"} size={12} color="#0F172A" />
                </div>

                {showSettings && (
                    <div>
                        <p className="timerule-sidepanel-input-label">Time Rule Title (optional)</p>
                        <Input
                            type="text"
                            placeholder="Enter Title"
                            value={rule?.title || ""}
                            onChange={(e) => updateRule({ title: e.target.value })}
                        />

                        <p className="timerule-sidepanel-input-label1">Time Zone</p>
                        <Select
                            mode="single"
                            placeholder="Please Time zone"
                            showSearch={false}
                            value={rule?.timeZone || "IST"}
                            onChange={(value) => updateRule({ timeZone: value })}
                            options={[
                                { label: "IST (Indian Standard Time)", value: "IST" },
                                { label: "UTC", value: "UTC" },
                            ]}
                        />
                    </div>
                )}
            </div>


            {/* ===== Branches ===== */}

            <div className="timerule-panel-branch-settings">
                <div
                    className="timerule-sidepanel-section-header"
                    style={{ marginTop: "10px" }}
                    onClick={() => setShowBranches((s) => !s)}
                >
                    <p>Branch Settings</p>
                    <Icon name={showBranches ? "uparrow" : "downarrow"} size={12} color="#0F172A" />
                </div>

                {showBranches && (
                    <>
                        {branches.map((branch) => (
                            <div key={branch.id} className="timerule-sidepanel-branch-block">
                                {/* Header with Remove */}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 8,
                                        marginBottom: 5
                                    }}
                                >
                                    <p
                                        className="timerule-sidepanel-branch-block-heading"
                                        style={{ margin: 0 }}
                                    >
                                        Branch Title (optional)
                                    </p>
                                    <Button
                                        variant="empty"
                                        onClick={() => removeBranch(branch.id)}
                                    >
                                        <Icon name="deletee" size={11} color="#5F6368" />
                                    </Button>
                                </div>

                                {/* Title */}
                                <Input
                                    type="text"
                                    placeholder="Enter branch title"
                                    value={branch.title}
                                    onChange={(e) => handleBranchTitleChange(branch, e.target.value)}
                                />

                                {/* Day toggles */}
                                <div className="timerule-sidepanel-branch-block-days-row">
                                    {dayLabels.map((d, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            className={`timerule-sidepanel-branch-block-days-day-btn ${branch.days.includes(i)
                                                ? "timerule-sidepanel-branch-block-days-day-btn-active"
                                                : ""
                                                }`}
                                            onClick={() => toggleDay(branch.id, i)}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>

                                {/* Time slots */}
                                {branch.timeSlots.map((slot) => (
                                    <div
                                        key={slot.id}
                                        className="timerule-sidepanel-branch-block-time-slot-row"
                                        style={{ alignItems: "flex-end" }}
                                    >
                                        <div className="timerule-sidepanel-branch-block-time-slot">
                                            <p className="timerule-sidepanel-input-label">From</p>
                                            <input
                                                type="time"
                                                value={slot.from}
                                                onChange={(e) =>
                                                    updateTimeSlot(branch.id, slot.id, "from", e.target.value)
                                                }
                                            />
                                        </div>
                                        <div className="timerule-sidepanel-branch-block-time-slot">
                                            <p className="timerule-sidepanel-input-label">To</p>
                                            <input
                                                type="time"
                                                value={slot.to}
                                                onChange={(e) =>
                                                    updateTimeSlot(branch.id, slot.id, "to", e.target.value)
                                                }
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}

                        <button
                            type="button"
                            className="timerule-sidepanel-branch-block-add-branch-btn"
                            onClick={() => addBranch({ title: "Time Branch" })}
                        >
                            <div className="timerule-sidepanel-branch-add-icon">
                                <Icon name="plus" size={11} color="white" />
                            </div> Add New Branch
                        </button>
                    </>
                )}
            </div>

        </div>
    );
}
