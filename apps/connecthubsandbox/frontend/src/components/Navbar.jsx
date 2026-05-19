import { useNavigate, useLocation } from "react-router-dom";
import "./styles/navbar.css";

import icons from "../constants/icon";
  
const Navbar = () => {``
  const navigate = useNavigate();
  const location = useLocation();
  // console.log(location)
  const reportPaths = [
    "/outgoing-report",
    "/audio-quality-check",
    "/incoming-report",
    "/queue-report",
    "/manual-fullprocess",
    "/ignore-report",
    "/hour-wise-report"
  ];

  if (reportPaths.includes(location.pathname)) {
    location.pathname = `/reports${location.pathname}`;
  }
  const {navbar_breadcrum_icon} = icons;


  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split("/").filter((x) => x);
    return pathnames.map((name, index) => {
      const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
      const isLast = index === pathnames.length - 1;
      return (
        <span key={name} className="navbar_breadcrumb">
          {!isLast ? (
            <span
              className="navbar_breadcrumb_link"
              onClick={() => navigate(routeTo)}
            >
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </span>
          ) : (
            <span className="navbar_breadcrumb_text">
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </span>
          )}
          {!isLast && <img className="navbar_breadcrum_icon" src={navbar_breadcrum_icon} alt="icon"/>}
        </span>
      );
    });
  };

  return (
    <div className="navbar">
      <p className="navbar_heading">Reports</p>
      <div className="navbar_beadcrum_conatiner">{generateBreadcrumbs()}</div>
    </div>
  );
};

export default Navbar;
