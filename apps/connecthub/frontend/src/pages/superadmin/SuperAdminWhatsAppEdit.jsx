import { useState, useEffect } from "react";
import "./styles/SuperAdminOnboardEdit.css";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../../constants/Icon.jsx";
import { useOnboard } from "../../store/superadmin/useOnboard.js";
import {
    Button,
    Loader,
    Navbar,
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
            <Navbar 
                title="WhatsApp Configuration"
                breadcrumbs={[
                    { label: "Dashboard", route: "/superadmin-dashboard" },
                    { label: "WhatsApp Onboard", route: "/superadmin-whatsapp" },
                    { label: "Edit", active: true }
                ]}
            />
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
