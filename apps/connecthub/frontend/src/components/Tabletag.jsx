import "./styles/Tabletag.css";
import Icon from "../constants/Icon.jsx";

const Tabletag = ({ text, icon, bgColor = "#e0f2fe", textColor = "#0369a1", borderColor = "#0369a1" }) => {
    return (
        <div className="custom-tabletag" style={{ backgroundColor: bgColor, color: textColor, border: `1px solid ${borderColor}` }}>
            {icon && <Icon name={icon} size={10} color={textColor} />}
            <span>{text}</span>
        </div>
    );
};

export default Tabletag;
