import { useEffect, useState, useCallback } from "react";
import "./styles/SuperAdminWhatsappPeer.css";
import { useWhatsappPeerStore } from "../../store/superadmin/useWhatsappPeerStore";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../../constants/Icon.jsx";
import {
    Modal,
    Button,
    FormInputError,
    Input,
    Table,
    Select,
    Loader,
    Tooltip,
} from "../../components/Index.jsx";
import { useDebounce } from "../../hooks/useDebounce.js";

const SuperAdminWhatsappPeer = ({ externalModalOpen, onExternalModalClose }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);

    const {
        PeerData,
        PeerTotalCount,
        isPeerLoading,
        getPeersfetch,
        createPeerNew,
        deletePeer,
        modalLoading,
        getProxy,
        isProxyLoading,
        proxyData,
    } = useWhatsappPeerStore();

    const initialFormData = {
        name: "",
        secret: "",
        host: "",
        port: "",
        proxyId: "",
        proxyName: "",
        proxyIPAddress: "",      // NEW
        proxyCodexName: "",      // NEW (maps p_codexName)
        proxyDirectoryName: "",  // NEW
    };

    const [page, setPage] = useState(Number(params.get("page")) || 1);
    const [pageSize, setPageSize] = useState(Number(params.get("per_page")) || 10);
    const [offset, setOffset] = useState((page - 1) * pageSize);
    const [whatsapppeerModalOpen, setWhatsappPeerModalOpen] = useState(false);

    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState(initialFormData);
    const [editId, setEditId] = useState("");
    const [sortField, setSortField] = useState("");
    const [sortOrder, setSortOrder] = useState("");
    const [searchString, setSearchString] = useState("");
    const debouncedSearchString = useDebounce(searchString, 500);

    useEffect(() => {
        navigate(`/superadmin-peer?tab=Whatsapp%20Peer&page=${page}&per_page=${pageSize}`, {
            replace: true,
        });
    }, [page, pageSize, navigate]);

    useEffect(() => {
        getPeersfetch(
            pageSize,
            offset,
            sortField,
            sortOrder,
            debouncedSearchString
        );
    }, [
        pageSize,
        offset,
        debouncedSearchString,
        sortField,
        sortOrder,
        getPeersfetch,
    ]);

    useEffect(() => {
        if (externalModalOpen) {
            setWhatsappPeerModalOpen(true);
            loadFormDependencies();
        }
    }, [externalModalOpen]);

    const loadFormDependencies = async () => {
        try {
            await Promise.all([getProxy()]);
        } catch (err) {
            console.error("Failed to load form dependencies:", err);
            setWhatsappPeerModalOpen(false);
        }
    };

    // ---------- Validation ----------
    const isDigits = (v) => /^[0-9]+$/.test(v);

    const validateField = (name, value) => {
        const v = (value ?? "").toString().trim();

        switch (name) {
            case "name":
            case "secret":
            case "host":
                return v ? "" : `${name[0].toUpperCase() + name.slice(1)} is required`;

            case "port": {
                if (!v) return "Port is required";
                if (!isDigits(v)) return "Port must be numeric";
                const n = parseInt(v, 10);
                return n >= 1 && n <= 65535 ? "" : "Port must be 1–65535";
            }

            case "prefix":
                if (!v) return "Prefix is required";
                return isDigits(v) ? "" : "Prefix must be numeric";

            case "pilotno":
                if (!v) return "Pilot Number is required";
                return isDigits(v) ? "" : "Pilot Number must be numeric";

            case "outboundPrefix":
                if (!v) return "Outbound Prefix is required";
                return isDigits(v) ? "" : "Outbound Prefix must be numeric";

            case "inboundPrefix":
                if (!v) return "Inbound Prefix is required";
                return isDigits(v) ? "" : "Inbound Prefix must be numeric";

            case "proxyId":
                return v ? "" : "Proxy is required";

            default:
                return "";
        }
    };

    const validateAll = (data) => {
        const fieldsToCheck = [
            "name",
            "secret",
            "host",
            "port",
            "proxyId",
        ];

        const nextErrors = {};
        fieldsToCheck.forEach((f) => {
            const err = validateField(f, data[f]);
            if (err) nextErrors[f] = err;
        });
        return nextErrors;
    };

    // Works for Input onChange(event) AND Select onChange(value) via an overload
    const handleChange = (arg1, maybeValue) => {
        // Select calls: handleChange("proxyId", "abc") or handleChange("name", "foo")
        if (typeof arg1 === "string") {
            const name = arg1;
            const value = maybeValue ?? "";
            setFormData((prev) => ({ ...prev, [name]: value }));
            setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
            return;
        }

        // Input calls: handleChange(event)
        const e = arg1;
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    };

    const handleSubmit = useCallback(
        async (e) => {

            e.preventDefault();

            const trimmed = Object.fromEntries(
                Object.entries(formData).map(([k, v]) => [k, (v ?? "").toString().trim()])
            );
            const newErrors = validateAll(trimmed);
            setErrors(newErrors);
            if (Object.keys(newErrors).length) return;

            try {

                await createPeerNew(trimmed);

                setWhatsappPeerModalOpen(false);
                 onExternalModalClose?.();
                setFormData(initialFormData);
                setErrors({});
                setEditId("");
                await getPeersfetch(
                    pageSize,
                    offset,
                    sortField,
                    sortOrder,
                    debouncedSearchString
                );
            } catch (err) {
                console.error("Save failed:", err);
                setWhatsappPeerModalOpen(true);

            }
        },
        [
            formData,
            editId,
            createPeerNew,
            getPeersfetch,
            pageSize,
            offset,
            sortField,
            sortOrder,
            debouncedSearchString,
        ]
    );


    const handleDelete = useCallback(
        async (id) => {
            try {
                await deletePeer(id);
                await getPeersfetch(
                    pageSize,
                    offset,
                    sortField,
                    sortOrder,
                    debouncedSearchString
                );
            } catch (err) {
                console.error("Delete failed:", err);
                setErrors((prev) => ({
                    ...prev,
                    form: err?.response?.data?.message || "Failed to delete peer.",
                }));
            }
        },
        [
            deletePeer,
            getPeersfetch,
            pageSize,
            offset,
            sortField,
            sortOrder,
            debouncedSearchString,
        ]
    );

    const handleCancel = () => {
        setFormData(initialFormData);
        setErrors({});
        setEditId("");
        setWhatsappPeerModalOpen(false);
        onExternalModalClose?.();
    };

    const fieldsConfig = [
        { name: "name", label: "Name", type: "text", placeholder: "Enter name" },
        { name: "secret", label: "Secret", type: "text", placeholder: "Enter secret"},
        { name: "host", label: "Host", type: "text", placeholder: "Enter host" },
        { name: "port", label: "Port", type: "text", placeholder: "Enter port", maxLength: 5 },
        { name: "proxyId", label: "Proxy Name", component: "select", placeholder: "Select proxy" },
    ];

    const columns = [
        {
            title: "S.no",
            key: "s_no",
            Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        },
        { title: "Name", key: "p_peerName", sort: true },
        { title: "Secret", key: "p_peerSecret" },
        { title: "Host", key: "p_peerHost", sort: true },
        { title: "Port", key: "p_peerPort", sort: true },
       
        {
            title: "Actions",
            key: "actions",
            Cell: (record) => (
                <div className="superadmin_whatsapp_peer_list_container_action_conatiner">
                    {/* <Tooltip content="Edit">
                        <Button
                            variant="empty"
                            onClick={() => handleEdit(record.p_peerId)}
                        >
                            <Icon name="edit" size={15} color="#5F6368" />
                        </Button>
                    </Tooltip> */}
                    <Tooltip content="Delete">
                        <Button
                            variant="empty"
                            onClick={() => handleDelete(record.p_peerId)}
                        >
                            <Icon name="deletee" size={15} color="#5F6368" />
                        </Button>
                    </Tooltip>
                </div>
            ),
        },
    ];

    return (
        <>
            <div className="superadmin_whatsapp_peer_list_container">
                <div className="superadmin_whatsapp_peer_list_container_table_search">
                    <Input
                        type="text"
                        placeholder="Search by Name, Pilot number"
                        width="400px"
                        suffixIcon="search"
                        suffixIconColor="#334155"
                        onChange={(e) => setSearchString(e.target.value)}
                        value={searchString}
                    />
                </div>

                <Table
                    columns={columns}
                    data={PeerData}
                    loading={isPeerLoading}
                    totaldata={PeerTotalCount}
                    page={page}
                    serverSide
                    pageSize={pageSize}
                    onPageChange={(pagevalues) => {
                        const allowedSortFields = [
                            "p_peerName",
                            "p_peerHost",
                            "p_peerPrefix",
                            "p_peerPort",
                            "p_peerType",
                            "p_peerStatus",
                            "p_peerPilotno",
                            "p_peerOutboundPrefix",
                            "p_peerInboundPrefix",
                            "p_createdOn",
                        ];
                        setPage(pagevalues.currentPage);
                        setPageSize(pagevalues.pageSize);
                        setOffset(pagevalues.pageSize * (pagevalues.currentPage - 1));
                        setSortField(
                            allowedSortFields.includes(pagevalues?.sortConfig?.key)
                                ? pagevalues.sortConfig.key
                                : "p_peerName"
                        );
                        setSortOrder(
                            ["ASC", "DESC"].includes(pagevalues?.sortConfig?.direction)
                                ? pagevalues.sortConfig.direction
                                : "ASC"
                        );
                    }}
                />
            </div>

            <Modal open={whatsapppeerModalOpen} width="720px" onClose={handleCancel}>
                <div className="superadmin_whatsapp_peer_modal_header_container">
                    <p className="superadmin_whatsapp_peer_modal_header">
                        {editId ? "Edit Peer" : "Create New Peer"}
                    </p>
                    <Button variant="empty" onClick={handleCancel}>
                        <Icon name="close" color="#0F172A" size="14" />
                    </Button>
                </div>

                {modalLoading || isProxyLoading ? (
                    <div style={{ height: "200px" }}>
                        <Loader />
                    </div>
                ) : (
                    <form className="superadmin_whatsapp_peer_modal_form" onSubmit={handleSubmit}>
                        <div className="superadmin_whatsapp_peer_modal_form_grid">
                            {fieldsConfig.map(
                                ({ name, label, type, placeholder, component, maxLength }) => (
                                    <div key={name} className="superadmin_whatsapp_peer_modal_form_group">
                                        <label className="form_label" htmlFor={name}>
                                            {label}
                                        </label>

                                        {component === "select" ? (
                                            <Select
                                                id={name}
                                                name={name}
                                                value={formData[name]}
                                                placeholder={placeholder}
                                                options={(proxyData || []).map((p) => ({
                                                    label: p.p_proxyDomainName,
                                                    value: p.p_proxyId,
                                                    meta: {
                                                        ip: p.p_proxyIPAddress,
                                                        codex: p.p_codexName,
                                                        dir: p.p_proxyDirectoryName,
                                                        domain: p.p_proxyDomainName,
                                                    },
                                                }))}
                                                showSearch={false}
                                                onChange={(valOrObj) => {
                                                    const chosen =
                                                        typeof valOrObj === "object" && valOrObj !== null
                                                            ? valOrObj
                                                            : (proxyData || [])
                                                                .map((p) => ({
                                                                    label: p.p_proxyDomainName,
                                                                    value: p.p_proxyId,
                                                                    meta: {
                                                                        ip: p.p_proxyIPAddress,
                                                                        codex: p.p_codexName,
                                                                        dir: p.p_proxyDirectoryName,
                                                                        domain: p.p_proxyDomainName,
                                                                    },
                                                                }))
                                                                .find((o) => o.value === valOrObj);

                                                    const value = chosen?.value ?? "";
                                                    const label = chosen?.label ?? "";
                                                    const meta = chosen?.meta ?? {};

                                                    // Update all proxy fields
                                                    handleChange("proxyId", value);
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        proxyName: label,
                                                        proxyIPAddress: meta.ip || "",
                                                        proxyCodexName: meta.codex || "",
                                                        proxyDirectoryName: meta.dir || "",
                                                    }));

                                                    // Field-level validation
                                                    setErrors((prev) => ({
                                                        ...prev,
                                                        proxyId: validateField("proxyId", value),
                                                    }));
                                                }}
                                            />
                                        ) : (
                                            <Input
                                                id={name}
                                                name={name}
                                                type={type}
                                                value={formData[name]}
                                                onChange={handleChange}
                                                placeholder={placeholder}
                                                {...(maxLength ? { maxLength } : {})}
                                            />
                                        )}

                                        {errors[name] && <FormInputError message={errors[name]} />}
                                    </div>
                                )
                            )}
                        </div>



                        <div className="contactbook_modal_footer">
                            <Button variant="secondary" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit">
                                Save
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </>
    );
};

export default SuperAdminWhatsappPeer;
