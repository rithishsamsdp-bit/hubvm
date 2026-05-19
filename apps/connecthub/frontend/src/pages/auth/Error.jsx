import "./styles/Error.css";
import Button from "../../components/Button";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

const Error = () => {
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
    <div className="error_page">
      <div className="error_card">
        <p className="error_heading">404 Error - Page not found</p>
        <p className="error_sub_text">Oops something went wrong please try again later.  If the problem persists, please contact your Pulse Administrator.</p>
        <div className="error_btn_container">
          <button className="error_contact_us_btn">Contact Us</button>
          <button className="error_homepage_btn" onClick={redirect}>Homepage</button>
        </div>
      </div>
    </div>
  )
}

export default Error