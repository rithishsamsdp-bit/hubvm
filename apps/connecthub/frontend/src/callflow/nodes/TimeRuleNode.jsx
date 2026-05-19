import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import "./styles/TimeRuleNode.css";
import Icon from "../../constants/Icon.jsx";

const TimeRuleNode = ({ data, selected }) => {
  console.log(data)
  return (
    <div className={`flow_timerule_node ${selected ? "flow_timerule_node_selected" : ""}`}>
      <div className="flow_timerule_center">
        <div className="flow_timerule_nodes_icon">
          <Icon name="timer" size={11} color="#FF5200" />
        </div>
        <div>
          <p className="flow_timerule_heading">Time Rule</p>
          <p className="flow_timerule_time">{data.timeZone}</p>
        </div>

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

  )
};

export default memo(TimeRuleNode);
