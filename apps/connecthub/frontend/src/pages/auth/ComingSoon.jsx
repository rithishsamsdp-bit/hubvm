import "./styles/ComingSoon.css";
import Button from "../../components/Button";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

const ComingSoon = () => {
  const navigate = useNavigate();
  const { authRole } = useAuthStore();

  const redirect = () => {
    console.log(authRole)
    if (authRole === "SUPERADMIN") {
      navigate("/admin-dashboard");
    } else if(authRole == "USER") {
      navigate("/agent-dashboard");
    }else if(authRole == "ADMIN"){
      navigate("/admin-dashboard");
    }
  }
  return (
    <div className="coming_soon_page">
      <div className="coming_soon_card">
        <p className="coming_soon_heading">Coming Soon</p>
        <p className="coming_soon_sub_text">We're working hard to bring you something amazing! This feature will be available soon. Please check back later or contact your Pulse Administrator for updates.</p>
        <div className="coming_soon_btn_container">
          <button className="coming_soon_contact_us_btn">Contact Us</button>
          <button className="coming_soon_homepage_btn" onClick={redirect}>Go Back</button>
        </div>
      </div>
    </div>
  )
}

export default ComingSoon