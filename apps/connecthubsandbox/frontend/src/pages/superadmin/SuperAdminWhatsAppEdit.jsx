import { useState, useEffect } from "react";
import "./styles/SuperAdminOnboardEdit.css";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../../constants/Icon.jsx";
import { useOnboard } from "../../store/superadmin/useOnboard.js";
import {
    Button,
    Loader,
} from "../../components/Index.jsx";
import WhatsAppMenu from "./limits/WhatsAppMenu.jsx";

const SuperAdminWhatsAppEdit = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const params = new URLSearchParams(location.search);
    const {
        getSelectLoading,
        getSelectedid,
        submitPlanDetails,
    } = useOnboard();

    const [id, setId] = useState(params.get("id") || "");

    useEffect(() => {
        getSelectedid(id);
    }, [id]);

    const handleCancel = () => {
        navigate("/superadmin-whatsapp");
    };

    const handlesubmit = async () => {
        await submitPlanDetails();
        navigate("/superadmin-whatsapp");
    };

    return (
        <div className="superadmin_onboard_edit_creation">
            {/* Header */}
            <div className="navbar_2">
                <div>
                    <p className="navbar_2_heading">WhatsApp Configuration</p>
                    <span className="navbar_2_breadcrumb">
                        <span
                            onClick={() => navigate("/superadmin-dashboard")}
                            className="navbar_2_breadcrumb_item"
                        >
                            Dashboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span
                            onClick={() => navigate("/superadmin-whatsapp")}
                            className="navbar_2_breadcrumb_item"
                        >
                            WhatsApp Onboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_2_breadcrumb_item active">Edit</span>
                    </span>
                </div>
            </div>
            {/* Form */}
            {getSelectLoading ? (
                <Loader />
            ) : (
                <div
                    className="superadmin_onboard_edit_form_container"
                    style={{ height: "calc(100% - 131px)", overflowY: "scroll" }}
                >
                    <div className="superadmin_onboard_edit_form">
                        {/* Tab Content */}
                        <div className="sa-tab-content">
                            <WhatsAppMenu />
                        </div>

                        <div className="superadmin_onboard_edit_form_actions">
                            <Button variant="secondary" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handlesubmit}>
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminWhatsAppEdit;
