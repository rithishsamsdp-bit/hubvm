import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import "./styles/VoicemailNode.css";
import Icon from "../../constants/Icon.jsx";


const VoicemailNode = ({ data, selected }) => (
  <div className={`flow_voicemail_node ${selected ? "flow_voicemail_node_selected" : ""}`}>
    <div className="flow_voicemail_center">
      <div className="flow_voicemail_nodes_icon">
        <Icon name="voicemail" size={11} color="#FF5200" />
      </div>
      <p className="flow_voicemail_heading">Voicemail</p>
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

export default memo(VoicemailNode);
