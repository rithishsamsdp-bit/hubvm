import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import "./styles/AudioMessageNode.css";
import Icon from "../../constants/Icon.jsx";

const AudioMessageNode = ({ data, selected }) => (
  <div className={`flow_audiomessage_node ${selected ? "flow_audiomessage_node_selected" : ""}`}>
    <div className="flow_audiomessage_center">
      <div className="flow_audiomessage_nodes_icon">
        <Icon name="play" size={11} color="#FF5200" />
      </div>
      <p className="flow_audiomessage_heading">Audio Message</p>
    </div>
    <Icon name='deletee' size={11} color="#5F6368" style={{ cursor: 'pointer' }} onClick={() => data?.onDelete?.()} />
    <Handle type="target" position={Position.Top} style={{
                    width: 10,
                    height: 10,
                    }}/>
    <Handle type="source" position={Position.Bottom} style={{
                    width: 10,
                    height: 10,
                    }}/>
  </div>
);

export default memo(AudioMessageNode);
