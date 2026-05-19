import "./styles/Break.css";
import icons from "../../constants/icon";
const Break = () => {
  const { pulselogo ,sidebar_avatar_icon} = icons;
  return (
    <div className="break">
      <div className="break-card">
        <img src={pulselogo} alt="Pulse Logo" className="breaklogo" />

        <div className="break_details_container">
         
          <div className="break_agent_details">
             <img src={sidebar_avatar_icon} alt='' className="break_agent_image"/>
            <div className="break_agent">
              <p className="break_agent_name">Jogan Dave</p>
              <p className="break_agent_type">Agent</p>
            </div>
          </div>
          <div className="break_time_details">
            <p className="break_time_heading">Break Time</p>
            <div className="break_time_container">
              <p className="break_timer">12:00</p>
            </div>
          </div>
        </div>

        <button className="break_ready_btn">Ready</button>
      </div>
    </div>
  );
};

export default Break;
