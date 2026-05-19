import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import "./styles/WaitingExperienceNode.css";
import Icon from "../../constants/Icon.jsx";

const WaitingExperienceNode = ({ data, selected }) => (
  <div className={`flow_waiting_experience_node ${selected ? "flow_waiting_experience_node_selected" : ""}`}>
    <div className="flow_waiting_experience_center">
      <div className="flow_waiting_experience_nodes_icon">
        <Icon name="sandclock" size={11} color="#FF5200" />
      </div>
      <p className="flow_waiting_experience_heading">Waiting Experience</p>
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

export default memo(WaitingExperienceNode);
