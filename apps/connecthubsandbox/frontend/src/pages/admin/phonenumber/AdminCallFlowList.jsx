import { useEffect, useState, useCallback } from "react";
import "./styles/AdminCallFlowList.css";
import { useCallFlow } from "../../../store/useCallFlow.js";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../../../constants/Icon.jsx";
import {
  Modal,
  Button,
  FormInputError,
  Input,
  Table,
} from "../../../components/Index.jsx";
import directLine from "../../../assets/callflow/directline.png";
import businessHours from "../../../assets/callflow/businesshours.png";
import ivrRouting from "../../../assets/callflow/ivrcallrouting.png";
import startFromScratch from "../../../assets/callflow/stratch.png";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

const AdminCallFlowList = ({ externalModalOpen, onExternalModalClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const {
    callFlowData,
    callFlowLoading,
    getCallflow,
    callFlowDataTotalCount,
    deleteCallflow,
  } = useCallFlow();
  const { authRole } = useAuthStore();

  const initialFormData = { callflowName: "", template: "" };

  // ✅ safer initialization (avoids NaN when no "page" in params)
  const [page, setPage] = useState(Number(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(Number(params.get("per_page")) || 10);
  const [offset, setOffset] = useState((page - 1) * pageSize);

  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(initialFormData);
  const [callFlowModalOpen, setCallFlowModalOpen] = useState(false);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [searchString, setSearchString] = useState("");
  const debouncedSearchString = useDebounce(searchString, 500);

  // ✅ only update URL when page/pageSize changes
  useEffect(() => {
    if (authRole === "TL") {
      navigate(
        `/tl-phonenumber?tab=Call%20Flow&page=${page}&per_page=${pageSize}`,
        { replace: true }
      );
    } else if (authRole === "ADMIN") {
      navigate(
        `/admin-phonenumber?tab=Call%20Flow&page=${page}&per_page=${pageSize}`,
        { replace: true }
      );
    }
  }, [page, pageSize, navigate]);

  // ✅ sync modal open state from parent
  useEffect(() => {
    if (externalModalOpen) setCallFlowModalOpen(true);
  }, [externalModalOpen]);

  // ✅ fetch callflow when filters/sort/search changes
  useEffect(() => {
    getCallflow(pageSize, offset, debouncedSearchString, sortField, sortOrder);
  }, [pageSize, offset, debouncedSearchString, sortField, sortOrder, getCallflow]);

  // ---------------- Table Columns ----------------
  const columns = [
    {
      title: "S.no",
      key: "s_no",
      Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
    },
    { title: "Call flow name", key: "c_callflowName" },
    {
      title: "Actions",
      key: "actions",
      Cell: (record) => (
        <div className="admin_callflow_list_action_conatiner">
          <Button
            variant="empty"
            onClick={() => handleView(record.c_callflowId, record.c_callflowName)}
          >
            <Icon name="eye" size={15} color="#5F6368" />
          </Button>
          {authRole === "ADMIN" && (
            <>
              <Button
                variant="empty"
                onClick={() => handleEdit(record.c_callflowId, record.c_callflowName)}
              >
                <Icon name="edit" size={15} color="#5F6368" />
              </Button>
              <Button
                variant="empty"
                onClick={() =>
                  handleDelete(record.c_callflowId, record.c_callflowName)
                }
              >
                <Icon name="deletee" size={15} color="#5F6368" />
              </Button>
            </>
          )}

        </div>
      ),
    },
  ];

  // ---------------- Validation ----------------
  const validateField = (name, value) => {
    switch (name) {
      case "callflowName":
        return value.trim() ? "" : "Call Flow Name is required";
      case "template":
        return value ? "" : "Please select a template";
      default:
        return "";
    }
  };

  // ---------------- Handlers ----------------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleTemplateSelect = (key) => {
    setFormData((prev) => ({ ...prev, template: key }));
    setErrors((prev) => ({ ...prev, template: validateField("template", key) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    Object.keys(formData).forEach((field) => {
      const msg = validateField(field, formData[field]);
      if (msg) newErrors[field] = msg;
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    navigate(
      `/admin-flowmapping?name=${encodeURIComponent(
        formData.callflowName
      )}&template=${formData.template}`
    );
  };

  const handleClose = () => {
    setCallFlowModalOpen(false);
    setFormData(initialFormData);
    setErrors({});
    onExternalModalClose?.();
  };

  const handleDelete = useCallback(
    async (id, name) => {
      try {
        await deleteCallflow(id, name);
        await getCallflow(pageSize, offset, debouncedSearchString, sortField, sortOrder);
      } catch (err) {
        console.error("Failed to delete callflow:", err);
      }
    },
    [deleteCallflow, getCallflow, pageSize, offset, debouncedSearchString, sortField, sortOrder]
  );

  const handleEdit = useCallback(
    (id, name) => {
      navigate(`/admin-flowmapping-edit?editid=${id}&name=${encodeURIComponent(name)}`);
    },
    [navigate]
  );

  const handleView = useCallback(
    (id, name) => {
      if (authRole === "TL") {
        navigate(`/tl-flowmapping-view?viewid=${id}&name=${encodeURIComponent(name)}`);
      }else if (authRole === "ADMIN") {
      navigate(`/admin-flowmapping-view?viewid=${id}&name=${encodeURIComponent(name)}`);
      }
    },
    [navigate]
  );

  // ---------------- Render ----------------
  return (
    <>
      <div className="admin_callflow_list_container">
        <div className="admin_callflow_list_table_heading_search">
          <Input
            type="text"
            placeholder="Search by Name, Number"
            width="400px"
            suffixIcon="search"
            suffixIconColor="#334155"
            onChange={(e) => setSearchString(e.target.value)}
            value={searchString}
          />
        </div>

        <Table
          columns={columns}
          data={callFlowData}
          loading={callFlowLoading}
          totaldata={callFlowDataTotalCount}
          page={page}
          serverSide
          pageSize={pageSize}
          onPageChange={(pagevalues) => {
            setPage(pagevalues.currentPage);
            setPageSize(pagevalues.pageSize);
            setOffset(pagevalues.pageSize * (pagevalues.currentPage - 1));
            setSortField(pagevalues.sortConfig?.key || "");
            setSortOrder(pagevalues.sortConfig?.direction || "");
          }}
        />
      </div>

      {/* Modal */}
      <Modal open={callFlowModalOpen} width="900px" onClose={handleClose}>
        <div className="admin_callflow_list_modal_header_container">
          <div className="admin_callflow_list_modal_heading_text_container">
            <p className="admin_callflow_list_modal_heading">IVR Builder</p>
            <p className="admin_callflow_list_modal_heading_sub_text">
              Select the Template to start building IVR
            </p>
          </div>
          <Button variant="empty" onClick={handleClose}>
            <Icon name="close" color="#0F172A" size="14" />
          </Button>
        </div>

        <form className="admin_callflow_list_modal_form" onSubmit={handleSubmit}>
          {/* Callflow Name */}
          <div className="admin_callflow_list_modal_form_grid">
            <div className="admin_callflow_list_modal_form_group">
              <label className="form_label">Call Flow Name</label>
              <Input
                name="callflowName"
                type="text"
                placeholder="Enter Call Flow Name"
                value={formData.callflowName}
                onChange={handleInputChange}
              />
              {errors.callflowName && (
                <FormInputError message={errors.callflowName} />
              )}
            </div>
          </div>

          {/* Template Grid */}
          <div className="admin_callflow_list_template_grid_container">
            {[
              {
                key: "direct",
                title: "Direct Line",
                img: directLine,
                desc: "Simple direct line setup",
              },
              {
                key: "businesshour",
                title: "Business Hours",
                img: businessHours,
                desc: "Route calls based on working hours",
              },
              {
                key: "callrouting",
                title: "IVR Call Routing",
                img: ivrRouting,
                desc: "Advanced IVR call routing options",
              },
              {
                key: "scratch",
                title: "Start From Scratch",
                img: startFromScratch,
                desc: "Build your IVR flow manually",
              },
            ].map((tpl) => (
              <div
                key={tpl.key}
                className={`admin_callflow_list_template_card ${formData.template === tpl.key ? "selected" : ""
                  }`}
                onClick={() => handleTemplateSelect(tpl.key)}
              >
                <img
                  src={tpl.img}
                  alt={tpl.title}
                  className="admin_callflow_list_template_img"
                />
                <div className="admin_callflow_list_template_value_container">
                  <h4 className="admin_callflow_list_template_title">
                    {tpl.title}
                  </h4>
                  <p className="admin_callflow_list_template_desc">
                    {tpl.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {errors.template && <FormInputError message={errors.template} />}

          {/* Footer */}
          <div className="admin_callflow_list_modal_footer">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="primary">Create</Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default AdminCallFlowList;
