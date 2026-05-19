import "./styles/FlowLeftPanel.css";
import Icon from "../../constants/Icon.jsx";

const FlowLeftPanel = ({ onAddNode }) => {
  const items = [
    // { label: "Date Rule", icon: "calender", type: "dateRule" },
    { label: "Time Rule", icon: "timer", type: "timeRule" },
    { label: "Audio Message", icon: "play", type: "audioMsg" },
    { label: "Keypad (IVR)", icon: "dialpad", type: "keypad" },
    // { label: "Waiting Experience", icon: "sandclock", type: "waitingExp" },
    { label: "Ring To", icon: "ring", type: "ringTo" },
    { label: "Voicemail", icon: "voicemail", type: "voicemail" },
    { label: "Api", icon: "api", type: "api" },
    { label: "Wss", icon: "automation", type: "wss" },
    { label: "AI Bot", icon: "automation", type: "aiBot" }
  ];

  return (
    <div className="FlowLeftPanel">
      <div className="FlowLeftPanel_heading_container">
        <p className="FlowLeftPanel_heading">Widgets</p>
      </div>

      {items.map((item) => (
        <div
          key={item.type}
          className="FlowLeftPanel_nodes"
          onClick={() => onAddNode(item.label, item.type)}
        >
          <div className="FlowLeftPanel_nodes_icon">
            <Icon name={item.icon} size={11} color="#FF5200" />
          </div>
          <p className="FlowLeftPanel_nodes_name">{item.label}</p>
        </div>
      ))}
    </div>
  );
};

export default FlowLeftPanel;
   