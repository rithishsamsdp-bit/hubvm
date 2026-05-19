import React from "react";
import { Input, FormInputError } from "../../../components/Index.jsx";
import { useOnboard } from "../../../store/superadmin/useOnboard.js";

const WhatsAppMenu = () => {
    const { getSelectedData, updateAccountField } = useOnboard();
    const errors = {}; // You might want to pass errors from the parent or handle them locally if needed

    const handleChange = (e) => {
        const { name, value } = e.target;
        updateAccountField(name, value);
    };

    return (
        <div>
            <p className="superadmin_onboard_edit_controller_heading">
                WhatsApp Configuration
            </p>
            <hr />

            <div className="superadmin_onboard_edit_form_grid">
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="whatsappNumber">
                        WhatsApp Number
                    </label>
                    <Input
                        id="whatsappNumber"
                        name="whatsappnumber"
                        placeholder="Enter WhatsApp Number"
                        value={getSelectedData?.whatsappnumber || ""}
                        onChange={handleChange}
                    />
                </div>
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="apiKey">
                        API Key
                    </label>
                    <Input
                        id="apiKey"
                        name="whatsappapikey"
                        placeholder="Enter API Key"
                        value={getSelectedData?.whatsappapikey || ""}
                        onChange={handleChange}
                    />
                </div>
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="phNumberId">
                        Phone Number ID
                    </label>
                    <Input
                        id="phNumberId"
                        name="whatsappphnumberid"
                        placeholder="Enter Phone Number ID"
                        value={getSelectedData?.whatsappphnumberid || ""}
                        onChange={handleChange}
                    />
                </div>
            </div>

            <div className="superadmin_onboard_edit_form_grid">
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="wabaID">
                        WABA ID
                    </label>
                    <Input
                        id="wabaID"
                        name="whatsappwabaid"
                        placeholder="Enter WABA ID"
                        value={getSelectedData?.whatsappwabaid || ""}
                        onChange={handleChange}
                    />
                </div>
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="currentBalance">
                        Current Balance
                    </label>
                    <Input
                        id="currentBalance"
                        name="whatsappbalance"
                        placeholder="Enter Current Balance"
                        value={getSelectedData?.whatsappbalance || ""}
                        onChange={handleChange}
                    />
                </div>
            </div>

            <p className="superadmin_onboard_edit_controller_heading" style={{ marginTop: "20px" }}>
                Amount Deduction
            </p>
            <hr />

            <div className="superadmin_onboard_edit_form_grid">
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="serviceCharge">
                        Service
                    </label>
                    <Input
                        id="serviceCharge"
                        name="whatsappservicecharge"
                        type="number"
                        placeholder="Enter Service Charge"
                        value={getSelectedData?.whatsappservicecharge || ""}
                        onChange={handleChange}
                    />
                </div>
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="utilityCharge">
                        Utility
                    </label>
                    <Input
                        id="utilityCharge"
                        name="whatsapputilitycharge"
                        type="number"
                        placeholder="Enter Utility Charge"
                        value={getSelectedData?.whatsapputilitycharge || ""}
                        onChange={handleChange}
                    />
                </div>
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="marketingCharge">
                        Marketing
                    </label>
                    <Input
                        id="marketingCharge"
                        name="whatsappmarketingcharge"
                        type="number"
                        placeholder="Enter Marketing Charge"
                        value={getSelectedData?.whatsappmarketingcharge || ""}
                        onChange={handleChange}
                    />
                </div>
            </div>
        </div>
    );
};

export default WhatsAppMenu;
