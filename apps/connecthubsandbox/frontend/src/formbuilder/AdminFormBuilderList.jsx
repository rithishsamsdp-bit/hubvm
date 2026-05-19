import { useEffect, useState } from "react";
import "./styles/AdminFormBuilderList.css";
import { useformStore } from "../store/admin/useformStore.js";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../constants/Icon.jsx";
import {
  Tooltip,
  Button,
  Input,
  Table,
  Modal,
  Badges,
  Popover
} from "../components/Index.jsx";
import FormModalDisplay from "./FormModalDisplay.jsx";
import { useDebounce } from "../hooks/useDebounce.js";
import { useAuthStore } from "../store/useAuthStore.js";

const AdminFormBuilderList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const {
    getFormList,
    formListData,
    formListCount,
    isFormLoading,
    deleteForm,
  } = useformStore();

  const { authRole } = useAuthStore();

  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(parseInt(params.get("per_page")) || 10);
  const [offset, setOffset] = useState((page - 1) * pageSize);
  const [searchString, setSearchString] = useState("");
  const [sortOrder, setSortOrder] = useState("ASC");
  const [sortField, setSortField] = useState("f_formName");
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewFormData, setPreviewFormData] = useState(null);
  const debouncedSearch = useDebounce(searchString, 500);

  useEffect(() => {
    if (authRole === "TL") {
      navigate(`/tl-campaign?tab=Form%20Builder&page=${page}&per_page=${pageSize}`);
    } else if (authRole === "ADMIN") {
      navigate(`/admin-campaign?tab=Form%20Builder&page=${page}&per_page=${pageSize}`);

    }
  }, [page, pageSize, navigate]);

  useEffect(() => {
    getFormList({ pageSize, offset, sortField, sortOrder, debouncedSearch });
  }, [pageSize, offset, sortField, sortOrder, debouncedSearch, getFormList]);

  const handleDelete = async (formId) => {
    await deleteForm(formId);
    getFormList({ pageSize, offset, sortField, sortOrder, debouncedSearch });

  };

  const columns = [
    {
      title: "S.no",
      key: "s_no",
      Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
    },
    { title: "Form Name", key: "f_formName", sort: true },
    {
      title: "Fields Count",
      key: "f_formcolumnName",
      Cell: (record) => {
        const count = record?.f_formPayload?.elements?.length || 0;
        return count;
      }
    },
    {
      title: "Created On",
      key: "f_createdOn",
      sort: true
    },
    {
      title: "Preview",
      key: "preview",
      Cell: (record) => (
        <Button
          variant="secondary"
          onClick={() => {
            if (record?.f_formPayload) {
              setPreviewFormData(record.f_formPayload);
              setIsPreviewModalOpen(true);
            } else {
              alert("Invalid form structure");
            }
          }}
        >
          Preview
        </Button>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      Cell: (record) => (
        <div className="admin_formbuilder_action_container">
          <Tooltip content="Edit">
            <Button
              variant="empty"
              onClick={() => navigate("/admin-campaign/admin-edit-formbuilder", {
                state: { formData: record.f_formPayload },
              })}
            >
              <Icon name="edit" size={15} color="#5F6368" />
            </Button>
          </Tooltip>
          <Tooltip content="Delete">
            <Button
              variant="empty"
              onClick={() => handleDelete(record.f_formId)}
            >
              <Icon name="deletee" size={15} color="#5F6368" />
            </Button>
          </Tooltip>
        </div>
      ),
    },
  ];

  const tlcolumns = columns.filter(col => col.key !== 'actions');

  return (
    <>
      <div className="admin_formbuildlist_container">
        <div className="admin_formbuildlist_table_search">
          <Input
            type="text"
            placeholder="Search by Form Name"
            width="400px"
            suffixIcon="search"
            suffixIconColor="#334155"
            onChange={(e) => setSearchString(e.target.value)}
            value={searchString}
          />
        </div>

        <Table
          columns={authRole === "TL" ? tlcolumns : columns}
          data={formListData}
          loading={isFormLoading}
          totaldata={formListCount}
          page={page}
          serverSide
          pageSize={pageSize}
          onPageChange={({ currentPage, pageSize, sortConfig }) => {
            const allowedSortFields = ["f_formName", "f_createdOn"];
            const allowedSortOrders = ["ASC", "DESC"];
            setPage(currentPage);
            setPageSize(pageSize);
            setOffset((currentPage - 1) * pageSize);
            setSortField(
              allowedSortFields.includes(sortConfig?.key) ? sortConfig.key : "f_formName"
            );
            setSortOrder(
              allowedSortOrders.includes(sortConfig?.direction) ? sortConfig.direction : "ASC"
            );
          }}
        />
      </div>

      <Modal title="Form Preview" width="720px" open={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)}>
        <div className="admin_formbuildlist_modal_header_container">
          <p className="admin_formbuildlist_modal_header">Form Preview</p>
          <Button variant="empty" onClick={() => setIsPreviewModalOpen(false)}>
            <Icon name="close" color="#0F172A" size={14} />
          </Button>
        </div>
        <div style={{ maxHeight: "50vh", overflowY: "auto", flexGrow: 1 }}>
          <FormModalDisplay formData={previewFormData} />
        </div>
        <div className="admin_formbuilder_modal_footer">
          <Button variant="primary" onClick={() => setIsPreviewModalOpen(false)}>
            Ok
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default AdminFormBuilderList;
