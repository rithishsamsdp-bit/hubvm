import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/ForgotPassword.css";
import icons from "../../constants/icon";

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [strengthLevel, setStrengthLevel] = useState(0);
  const [strengthText, setStrengthText] = useState("");

  const {
    pulselogo,
    next_icon,
    tick_icon,
    login_pass_view,
    login_pass_hide,
    login_input_error,
  } = icons;

  const next_step = () => {
    if (step === 1 && email) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (password === confirmPassword && validatePassword(password)) {
        alert("Password successfully reset!");
      } else {
        alert("Passwords do not match or invalid format.");
      }
    }
  };

  const togglePassword = () => setShowPassword((prev) => !prev);
  const toggleConfirmPassword = () => setShowConfirmPassword((prev) => !prev);

  const editEmail = () => setStep(1);

  const validatePassword = (pwd) => {
    return (
      pwd.length >= 8 &&
      /[A-Z]/.test(pwd) &&
      /[a-z]/.test(pwd) &&
      /\d/.test(pwd) &&
      /[^a-zA-Z0-9]/.test(pwd)
    );
  };

  const checkPasswordStrength = (pwd) => {
    let level = 0;
    if (pwd.length >= 5) level++;
    if (pwd.length >= 8) level++;
    if (pwd.length >= 10) level++;
    // if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) level++;
    // if (/\d/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd)) level++;

    setStrengthLevel(level);

    if (level === 0) setStrengthText("Weak");
    else if (level === 1) setStrengthText("Good");
    else if (level === 2) setStrengthText("Strong");
    else setStrengthText("Strong");
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    checkPasswordStrength(value);
  };
  return (
    <div className="forgot-pass">
      <div className="forgot-pass-card">
        <img src={pulselogo} alt="Pulse Logo" className="forgot-pass-logo" />
        <h3 className="forgot-pass-heading">Forgot Password</h3>
        <h4 className="forgot-pass-subheading">
          {step === 1
            ? "Please enter the email to get code"
            : step === 2
            ? "Please enter the code sent to your email"
            : "Set your new password"}
        </h4>

        <div className="forgot-pass-stepper">
          <div
            className={`forgot-pass-step ${
              step >= 1 ? "forgot-pass-step-active" : ""
            }`}
            data-step="1"
          >
            Get code
          </div>
          <img src={next_icon} alt="arrow" className="forgot-pass-arrow-icon" />
          <div
            className={`forgot-pass-step ${
              step >= 2 ? "forgot-pass-step-active" : ""
            }`}
            data-step="2"
          >
            Verify
          </div>
          <img src={next_icon} alt="arrow" className="forgot-pass-arrow-icon" />
          <div
            className={`forgot-pass-step ${
              step === 3 ? "forgot-pass-step-active" : ""
            }`}
            data-step="3"
          >
            Reset Password
          </div>
        </div>

        <div className="forgot-pass-card-body">
          {step === 1 && (
            <>
              <div className="forgot-input-group forgot-pass-input-group">
                <label className="forgot-input-label">Email</label>
                <input
                  type="email"
                  className="forgot-email-input"
                  placeholder="Enter Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="forgot-pass-email-display-container">
                <div className="forgot-pass-email-display">
                  <span className="forgot-pass-email-display-name">
                    {email}
                  </span>
                  <a
                    href="#"
                    className="forgot-pass-email-display-name-edit"
                    onClick={editEmail}
                  >
                    Edit email
                  </a>
                </div>
              </div>
              <div className="forgot-pass-email-code-input-group">
                <label className="forgot-pass-email-code-input-label">
                  Enter Code received through above Email
                </label>
                <input
                  type="text"
                  className="forgot-pass-email-code-input"
                  placeholder="Enter code"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="forgot-pass-reset-input-group">
                <label className="forgot-pass-reset-label">
                  Set New Password
                </label>
                <div className="forgot-pass-reset-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="forgot-pass-input"
                    placeholder="Enter new password"
                    value={password}
                    onChange={handleChange}
                  />
                  <img
                    src={showPassword ? login_pass_hide : login_pass_view}
                    alt="Toggle Visibility"
                    className="forgot-pass-eye-icon"
                    onClick={togglePassword}
                  />
                </div>
              </div>
              {password && (
                <div className="forgot-pass-strength-container">
                  <div
                    className={`forgot-pass-step-process ${
                      strengthLevel > 0 ? "forgot-pass-step-process-filled" : ""
                    }`}
                  ></div>
                  <div
                    className={`forgot-pass-step-process ${
                      strengthLevel > 1 ? "forgot-pass-step-process-filled" : ""
                    }`}
                  ></div>
                  <div
                    className={`forgot-pass-step-process ${
                      strengthLevel > 2 ? "forgot-pass-step-process-filled" : ""
                    }`}
                  ></div>
                  {strengthText && (
                    <span
                      className={`forgot-pass-step-strength-label ${strengthText.toLowerCase()}`}
                    >
                      {strengthText}
                    </span>
                  )}
                </div>
              )}
              {password && (
                <div className="password-rules-container">
                  <p
                    className={`password-rules ${
                      password.length >= 7
                        ? "forgot-pass-valid"
                        : "forgot-pass-unvalid"
                    }`}
                  >
                    {password.length >= 7 ? (
                      <img
                        src={tick_icon}
                        alt="tick"
                        className="forgot-pass-tick-icon"
                      />
                    ) : (
                      <img
                        src={login_input_error}
                        alt="tick"
                        className="forgot-pass-error-icon"
                      />
                    )}
                    Passwords must contain a minimum of 8 characters.
                  </p>

                  <p
                    className={`password-rules ${
                      /[A-Z]/.test(password) && /[a-z]/.test(password)
                        ? "forgot-pass-valid"
                        : "forgot-pass-unvalid"
                    }`}
                  >
                    {/[A-Z]/.test(password) && /[a-z]/.test(password) ? (
                      <img
                        src={tick_icon}
                        alt="tick"
                        className="forgot-pass-tick-icon"
                      />
                    ) : (
                      <img
                        src={login_input_error}
                        alt="tick"
                        className="forgot-pass-error-icon"
                      />
                    )}
                    Must include uppercase and lowercase letters.
                  </p>
                  <p
                    className={`password-rules ${
                      /\d/.test(password) && /[^a-zA-Z0-9]/.test(password)
                        ? "forgot-pass-valid"
                        : "forgot-pass-unvalid"
                    }`}
                  >
                    {/\d/.test(password) && /[^a-zA-Z0-9]/.test(password) ? (
                      <img
                        src={tick_icon}
                        alt="tick"
                        className="forgot-pass-tick-icon"
                      />
                    ) : (
                      <img
                        src={login_input_error}
                        alt="tick"
                        className="forgot-pass-error-icon"
                      />
                    )}
                    Must use numbers and special characters.
                  </p>
                </div>
              )}

              <div className="forgot-pass-reset-reinput-group">
                <label className="forgot-pass-reset-label">
                  Re-enter Password
                </label>
                <div className="forgot-pass-reset-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="forgot-pass-input"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onPaste={(e) => e.preventDefault()}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <img
                    src={
                      showConfirmPassword ? login_pass_hide : login_pass_view
                    }
                    alt="Toggle Visibility"
                    className="forgot-pass-eye-icon"
                    onClick={toggleConfirmPassword}
                  />
                </div>
              </div>
            </>
          )}

          <button className="forgot-pass-continue-btn" onClick={next_step}>
            {step === 1 ? "Continue" : step === 2 ? "Verify" : "Reset"}
          </button>
          {step !== 3 && (
            <h5 className="signin-text">
              Already have an account?&nbsp; 
              <span className="signin-btn" onClick={() => navigate("/Login")}>
                Sign in
              </span>
            </h5>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
