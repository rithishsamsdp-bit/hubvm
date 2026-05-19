import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import "./styles/DateRuleNode.css"
import Icon from "../../constants/Icon.jsx";

const DateRuleNode = ({ data, selected }) => (
  <div className={`flow_daterule_node ${selected ? "flow_daterule_node_selected" : ""}`}>
    <div className="flow_daterule_center">
      <div className="flow_daterule_nodes_icon">
        <Icon name="calender" size={11} color="#FF5200" />
      </div>
      <p className="flow_daterule_heading">Date Rule</p>
    </div>
    <Icon name='deletee' size={11} color="#5F6368" style={{ cursor: 'pointer' }} onClick={() => data?.onDelete?.()} />
    <Handle type="target" position={Position.Top} style={{
      width: 10,
      height: 10,
    }} />
    <Handle type="source" position={Position.Bottom} style={{
      width: 10,
      height: 10,
    }} />
  </div>
);

export default memo(DateRuleNode);
