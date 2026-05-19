import { useState } from "react";
import "./styles/AccountDeletion.css";
import icons from "../../constants/icon";
import {
    Input,
    FormInputError,
} from "../../components/Index.jsx";

const { pulselogo } = icons;

const AccountDeletion = () => {
    const [values, setValues] = useState({
        username: "",
        password: "",
    });
    const [errors, setErrors] = useState({});
    const [isDeleted, setIsDeleted] = useState(false);

    const handleChange = (name) => (e) => {
        setValues((prev) => ({ ...prev, [name]: e.target.value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: false }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const newErrors = {};

        if (values.username.trim() === "") {
            newErrors.username = true;
        }

        if (values.password.trim() === "") {
            newErrors.password = true;
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length) return;

        // Show success alert regardless of credentials
        alert("Account successfully deleted");
        setIsDeleted(true);
    };

    return (
        <div>
            <div className="account-deletion">
                <div className="account-deletion-card">
                    <img src={pulselogo} alt="Pulse Logo" className="account-deletion-logo" />
                    <h3 className="account-deletion-heading">Delete Account</h3>
                    <p className="account-deletion-subtitle">
                        Please enter your credentials to confirm account deletion
                    </p>

                    {isDeleted ? (
                        <div className="account-deletion-success">
                            <div className="success-icon">✓</div>
                            <p>Your account deletion request has been submitted successfully.</p>
                        </div>
                    ) : (
                        <form
                            className="account-deletion-body"
                            onSubmit={handleSubmit}
                            noValidate
                        >
                            <div className="account-deletion-input-group">
                                <label className="form_label">Username</label>
                                <Input
                                    type="text"
                                    name="username"
                                    placeholder="Enter Username"
                                    value={values.username}
                                    onChange={handleChange("username")}
                                    autoComplete=""
                                />
                                {errors.username && (
                                    <FormInputError message="Username is required" />
                                )}
                            </div>

                            <div className="account-deletion-input-group">
                                <label className="form_label">Password</label>
                                <Input
                                    type="password"
                                    name="password"
                                    placeholder="Enter Password"
                                    value={values.password}
                                    onChange={handleChange("password")}
                                    autoComplete=""
                                />
                                {errors.password && (
                                    <FormInputError message="Password is required" />
                                )}
                            </div>

                            <button type="submit" className="account-deletion-btn">
                                Confirm Delete Account
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountDeletion;
