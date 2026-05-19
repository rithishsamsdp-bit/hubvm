import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/SuperAdminOnboardCreate.css";
import {
  Input,
  Button,
  Select,
  Icon,
  FormInputError,
} from "../../components/Index.jsx";
import { TIMEZONES } from "../../constants/timezone.js";

const SuperAdminOnboardCreate = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    custName: "",
    acccode: "",
    contact: "",
    mailid: "",
    businessvertical: "",
    plan: "",
    serviceRegion: "",
    timezone: "",
    salepersonname: "",
    aadhaarFront: null,
    aadhaarBack: null,
    panCard: null,
    otp: ["", "", "", ""],
    signatureType: "draw", // "draw" or "style"
    selectedStyle: null,
    signature: null,
  });

  const [errors, setErrors] = useState({});
  const [previews, setPreviews] = useState({
    aadhaarFront: null,
    aadhaarBack: null,
    panCard: null,
  });

  const signatureCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // --- Multi-step Logic ---
  const totalSteps = 4;
  const steps = [
    { id: 1, label: "Customer Details", icon: "user" },
    { id: 2, label: "KYC Verification", icon: "verified" },
    { id: 3, label: "OTP Verification", icon: "sms" },
    { id: 4, label: "Digital Signature", icon: "edit" },
  ];

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        // Final submit
        setCurrentStep(5); // Success state
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateStep = (step) => {
    let stepErrors = {};
    if (step === 1) {
      if (!formData.custName) stepErrors.custName = "Customer Name is required";
      if (!formData.acccode) stepErrors.acccode = "Account Code is required";
      if (!formData.contact) stepErrors.contact = "Contact is required";
      if (!formData.mailid) stepErrors.mailid = "Email is required";
      if (!formData.plan) stepErrors.plan = "Plan is required";
    } else if (step === 2) {
      if (!formData.aadhaarFront) stepErrors.aadhaarFront = "Aadhaar Front is required";
      if (!formData.aadhaarBack) stepErrors.aadhaarBack = "Aadhaar Back is required";
      if (!formData.panCard) stepErrors.panCard = "PAN Card is required";
    } else if (step === 3) {
      if (formData.otp.some((d) => d === "")) stepErrors.otp = "Complete OTP is required";
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  // --- Handlers ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileUpload = (e, name) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [name]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => ({ ...prev, [name]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...formData.otp];
    newOtp[index] = value.substring(value.length - 1);
    setFormData((prev) => ({ ...prev, otp: newOtp }));

    // Auto focus next input
    if (value && index < 3) {
      const nextInput = document.querySelector(`input[name=otp-${index + 1}]`);
      if (nextInput) nextInput.focus();
    }
  };

  // --- Signature Pad Logic ---
  useEffect(() => {
    if (currentStep === 4 && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
    }
  }, [currentStep]);

  const startDrawing = (e) => {
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = signatureCanvasRef.current;
    setFormData((prev) => ({ ...prev, signature: canvas.toDataURL() }));
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setFormData((prev) => ({ ...prev, signature: null, selectedStyle: null }));
  };

  const handleStyleSelect = (style) => {
    setFormData((prev) => ({
      ...prev,
      selectedStyle: style,
      signature: `style:${style}:${formData.custName}`
    }));
  };

  // --- Render Helpers ---
  const renderStep1 = () => (
    <div className="onboard_form_grid">
      <div className="onboard_form_group">
        <label className="form_label">Customer Name</label>
        <Input
          name="custName"
          value={formData.custName}
          onChange={handleInputChange}
          placeholder="Enter Customer Name"
        />
        {errors.custName && <FormInputError message={errors.custName} />}
      </div>
      <div className="onboard_form_group">
        <label className="form_label">Account Code</label>
        <Input
          name="acccode"
          value={formData.acccode}
          onChange={handleInputChange}
          placeholder="Enter Account Code"
        />
        {errors.acccode && <FormInputError message={errors.acccode} />}
      </div>
      <div className="onboard_form_group">
        <label className="form_label">Contact Number</label>
        <Input
          name="contact"
          type="tel"
          value={formData.contact}
          onChange={handleInputChange}
          placeholder="Enter Contact Number"
        />
        {errors.contact && <FormInputError message={errors.contact} />}
      </div>
      <div className="onboard_form_group">
        <label className="form_label">Email Address</label>
        <Input
          name="mailid"
          type="email"
          value={formData.mailid}
          onChange={handleInputChange}
          placeholder="Enter Email Address"
        />
        {errors.mailid && <FormInputError message={errors.mailid} />}
      </div>
      <div className="onboard_form_group">
        <label className="form_label">Plan</label>
        <Select
          name="plan"
          value={formData.plan}
          onChange={(val) => handleSelectChange("plan", val)}
          placeholder="Select Plan"
          options={[
            { value: "Basic", label: "Basic" },
            { value: "Professional", label: "Professional" },
            { value: "Enterprise", label: "Enterprise" },
          ]}
        />
        {errors.plan && <FormInputError message={errors.plan} />}
      </div>
      <div className="onboard_form_group">
        <label className="form_label">Service Region</label>
        <Select
          name="serviceRegion"
          value={formData.serviceRegion}
          onChange={(val) => handleSelectChange("serviceRegion", val)}
          placeholder="Select Region"
          options={[
            { value: "Domestic", label: "Domestic" },
            { value: "International", label: "International" },
            { value: "Domestic-mid", label: "Domestic-mid" },
            { value: "International-mid", label: "International-mid" },
          ]}
        />
      </div>
      <div className="onboard_form_group onboard_form_full">
        <label className="form_label">Time Zone</label>
        <Select
          name="timezone"
          value={formData.timezone}
          onChange={(val) => handleSelectChange("timezone", val)}
          placeholder="Select Time Zone"
          showSearch={true}
          options={TIMEZONES}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="kyc_upload_section">
      <div className="onboard_form_full">
        <h4>Identity Verification</h4>
        <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
          Please upload clear images of your Aadhaar Card and PAN Card.
        </p>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <h5 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Aadhaar Card (Front & Back)</h5>
        <div className="upload_boxes_container">
          <div
            className={`upload_box ${previews.aadhaarFront ? "has_file" : ""}`}
            onClick={() => document.getElementById("frontInput").click()}
          >
            <input
              id="frontInput"
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => handleFileUpload(e, "aadhaarFront")}
            />
            {previews.aadhaarFront ? (
              <img src={previews.aadhaarFront} alt="Front Preview" className="preview_image" />
            ) : (
              <>
                <Icon name="upload" size={24} color="#94a3b8" />
                <span className="upload_box_label">Aadhaar Front</span>
              </>
            )}
          </div>
          <div
            className={`upload_box ${previews.aadhaarBack ? "has_file" : ""}`}
            onClick={() => document.getElementById("backInput").click()}
          >
            <input
              id="backInput"
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => handleFileUpload(e, "aadhaarBack")}
            />
            {previews.aadhaarBack ? (
              <img src={previews.aadhaarBack} alt="Back Preview" className="preview_image" />
            ) : (
              <>
                <Icon name="upload" size={24} color="#94a3b8" />
                <span className="upload_box_label">Aadhaar Back</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div>
        <h5 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>PAN Card</h5>
        <div className="upload_boxes_container">
          <div
            className={`upload_box ${previews.panCard ? "has_file" : ""}`}
            style={{ maxWidth: "50%" }}
            onClick={() => document.getElementById("panInput").click()}
          >
            <input
              id="panInput"
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => handleFileUpload(e, "panCard")}
            />
            {previews.panCard ? (
              <img src={previews.panCard} alt="PAN Preview" className="preview_image" />
            ) : (
              <>
                <Icon name="upload" size={24} color="#94a3b8" />
                <span className="upload_box_label">Upload PAN Card</span>
              </>
            )}
          </div>
        </div>
      </div>

      {(errors.aadhaarFront || errors.aadhaarBack || errors.panCard) && (
        <FormInputError message="All identification documents are required" />
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="otp_verification_container">
      <div className="onboard_form_full">
        <div style={{ marginBottom: "20px" }}>
          <Icon name="sms" size={48} color="#ff5200" />
        </div>
        <h4>OTP Verification</h4>
        <p style={{ color: "#64748b", fontSize: "14px", marginTop: "8px" }}>
          We've sent a 4-digit code to your registered mobile number ending in **{formData.contact.slice(-4) || "8800"}.
        </p>
      </div>
      <div className="otp_inputs_wrapper">
        {formData.otp.map((digit, index) => (
          <input
            key={index}
            name={`otp-${index}`}
            type="text"
            maxLength="1"
            className="otp_input"
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
          />
        ))}
      </div>
      {errors.otp && <FormInputError message={errors.otp} />}
      <p style={{ fontSize: "14px", color: "#64748b" }}>
        Didn't receive the code? <span style={{ color: "#ff5200", fontWeight: "600", cursor: "pointer" }}>Resend OTP</span>
      </p>
    </div>
  );

  const renderStep4 = () => (
    <div className="kyc_upload_section">
      <div className="onboard_form_full">
        <h4>Digital Signature</h4>
        <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
          Please provide your digital signature to complete the onboarding process.
        </p>
      </div>

      <div className="signature_options_tabs">
        <div
          className={`signature_tab ${formData.signatureType === "draw" ? "active" : ""}`}
          onClick={() => setFormData(prev => ({ ...prev, signatureType: "draw", signature: null, selectedStyle: null }))}
        >
          Draw Signature
        </div>
        <div
          className={`signature_tab ${formData.signatureType === "style" ? "active" : ""}`}
          onClick={() => setFormData(prev => ({ ...prev, signatureType: "style", signature: null }))}
        >
          Choose a Style
        </div>
      </div>

      {formData.signatureType === "draw" ? (
        <div className="signature_container">
          <canvas
            ref={signatureCanvasRef}
            className="signature_pad"
            width={800}
            height={240}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
          />
          <div className="signature_actions">
            <Button variant="secondary" onClick={clearSignature}>
              Clear
            </Button>
          </div>
        </div>
      ) : (
        <div className="signature_suggestion_grid">
          {[
            { id: "sig_dancing", label: "Elegant" },
            { id: "sig_pacifico", label: "Casual" },
            { id: "sig_sacramento", label: "Classic" },
            { id: "sig_delafield", label: "Artistic" },
          ].map((style) => (
            <div
              key={style.id}
              className={`signature_suggestion_card ${style.id} ${formData.selectedStyle === style.id ? "selected" : ""}`}
              onClick={() => handleStyleSelect(style.id)}
            >
              {formData.custName || "Signature"}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSuccess = () => (
    <div className="success_container">
      <div className="success_icon_wrapper">
        <Icon name="verified" size={48} />
      </div>
      <h2>Onboarding Successful!</h2>
      <p style={{ color: "#64748b", fontSize: "16px", maxWidth: "450px" }}>
        Customer <strong>{formData.custName}</strong> has been successfully onboarded with KYC verification and digital signature.
      </p>
      <div style={{ marginTop: "24px" }}>
        <Button variant="primary" onClick={() => navigate("/superadmin-onboard")}>
          Go to Onboard List
        </Button>
      </div>
    </div>
  );

  return (
    <div className="superadmin_onboard_create_page">
      <div className="navbar_1">
        <div>
          <p className="navbar_1_heading">Create Customer Onboard</p>
          <span className="navbar_1_breadcrumb">
            <span onClick={() => navigate("/superadmin-dashboard")} className="navbar_1_breadcrumb_item">
              Dashboard
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span onClick={() => navigate("/superadmin-onboard")} className="navbar_1_breadcrumb_item">
              Onboard
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span className="navbar_1_breadcrumb_item active">Create KYC</span>
          </span>
        </div>
      </div>

      <div className="onboard_create_content">
        <div className="onboard_create_card">
          {currentStep <= totalSteps && (
            <div className="onboard_stepper">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`step_item ${currentStep === step.id ? "active" : ""} ${currentStep > step.id ? "completed" : ""}`}
                >
                  <div className="step_circle">
                    {currentStep > step.id ? (
                      <Icon name="verified" size={20} color="white" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className="step_label">{step.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="onboard_form_container">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderSuccess()}
          </div>

          {currentStep <= totalSteps && (
            <div className="form_footer">
              <Button
                variant="secondary"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                Back
              </Button>
              <Button variant="primary" onClick={handleNext}>
                {currentStep === totalSteps ? "Submit & Complete" : "Next Step"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminOnboardCreate;
