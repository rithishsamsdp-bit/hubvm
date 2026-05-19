import "./styles/Tag.css";
import Icon from "../constants/Icon.jsx";

const Tag = ({ text, icon, bgColor = "#e0f2fe", textColor = "#0369a1" ,width = "auto"  }) => {
  return (
    <div className="custom-tag" style={{ backgroundColor: bgColor, color: textColor , width: width  }}>
      {icon && <Icon name={icon} size={10} color={textColor}/>}
      <span>{text}</span>
    </div>
  );
};

export default Tag;
