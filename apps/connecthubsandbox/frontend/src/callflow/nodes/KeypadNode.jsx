import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import "./styles/KeypadNode.css";
import Icon from "../../constants/Icon.jsx";


const KeypadNode = ({ data, selected }) => {
  console.log(data)
  return (
    <div className={`flow_keypad_node ${selected ? "flow_keypad_node_selected" : ""}`}>
      <div className="flow_keypad_center">
        <div className="flow_keypad_nodes_icon">
          <Icon name="dialpad" size={11} color="#FF5200" />
        </div>
        <div>
          <p className="flow_keypad_heading">Keypad (IVR)</p>
          <p className="flow_timerule_time">{data.buttons?.length || 0} options</p>
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

export default memo(KeypadNode);
