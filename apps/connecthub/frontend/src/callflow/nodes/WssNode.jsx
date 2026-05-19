import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import "./styles/RingToNode.css";
import Icon from "../../constants/Icon.jsx";

const WssNode = ({ data, selected }) => {
  return (
    <div
      className={`flow_ringto_node ${
        selected ? "flow_ringto_node_selected" : ""
      }`}
    >
      <div className="flow_ringto_center">
        <div className="flow_ringto_nodes_icon">
          <Icon name="automation" size={11} color="#FF5200" />
        </div>
        <p className="flow_ringto_heading">Wss</p>
      </div>
      <Icon
        name="deletee"
        size={11}
        color="#5F6368"
        style={{ cursor: "pointer" }}
        onClick={() => data?.onDelete?.()}
      />
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 10,
          height: 10,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 10,
          height: 10,
        }}
      />
    </div>
  );
};

export default memo(WssNode);
