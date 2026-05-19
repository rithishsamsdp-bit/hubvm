import React, { memo } from "react";
import { Handle, Position } from "reactflow";

const CallEndNode = ({ data, selected }) => {
    const label = data?.label ?? "Call End";

    return (
        <div className="flow_initial_node">
            <div className="flow_initial_node_label">Call Ends</div>

            <Handle
                type="target"
                position={Position.Top}
                id="in"
                style={{
                    width: 10,
                    height: 10,
                    background: "#e74c3c",
                    border: "2px solid #fff",
                }}
            />
        </div>
    );
};

export default memo(CallEndNode);
