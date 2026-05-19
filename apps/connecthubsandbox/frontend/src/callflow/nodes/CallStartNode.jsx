import React, { memo } from "react";
import "./styles/InitialNode.css";
import { Handle, Position } from "reactflow";

const CallStartNode = () => {

    return (
        <div className="flow_initial_node">
            <p className="flow_initial_node_label">Call come in</p>
            <Handle
                type="source"
                position={Position.Bottom}
                id="out"
                style={{
                    width: 10,
                    height: 10,
                    background: "#2ecc71",
                    border: "2px solid #fff",
                }}
            />
        </div>
    );
};

export default memo(CallStartNode);
